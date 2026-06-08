#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";

const rawArgs = process.argv.slice(2);
const jsonOutput = rawArgs.includes("--json");
const deep = rawArgs.includes("--deep");

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  return rawArgs.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

const envFile = getArg("env", ".env.local");

function parseEnv(text) {
  const env = {};

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;

    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function isValidHttpsUrl(value) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function isLikelyJwt(value) {
  return typeof value === "string" && value.split(".").length === 3;
}

async function fetchWithTimeout(url, init, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timeout);
  }
}

function check(name, ok, message) {
  return { name, ok, ...(message ? { message } : {}) };
}

async function requestSupabase(url, key, path) {
  try {
    const response = await fetchWithTimeout(`${url.replace(/\/$/, "")}${path}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    const body = await response.text().catch(() => "");
    return {
      ok: response.ok,
      status: response.status,
      body: body.slice(0, 180),
    };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  if (!existsSync(envFile)) {
    const result = {
      ok: false,
      envFile,
      checks: [check("env:file", false, `${envFile} 파일이 없습니다.`)],
    };
    console.log(jsonOutput ? JSON.stringify(result, null, 2) : `fail env:file ${result.checks[0].message}`);
    process.exit(1);
  }

  const env = parseEnv(readFileSync(envFile, "utf8"));
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const checks = [
    check("env:file", true),
    check("env:supabase_url", Boolean(supabaseUrl), "NEXT_PUBLIC_SUPABASE_URL이 필요합니다."),
    check("env:supabase_url_format", isValidHttpsUrl(supabaseUrl), "Supabase URL은 https URL이어야 합니다."),
    check("env:supabase_anon_key", Boolean(anonKey), "NEXT_PUBLIC_SUPABASE_ANON_KEY가 필요합니다."),
    check("env:supabase_anon_key_format", isLikelyJwt(anonKey), "anon key는 JWT 형식이어야 합니다."),
  ];

  if (deep) {
    checks.push(
      check("env:supabase_service_role_key", Boolean(serviceRoleKey), "SUPABASE_SERVICE_ROLE_KEY가 필요합니다."),
      check("env:supabase_service_role_key_format", isLikelyJwt(serviceRoleKey), "service role key는 JWT 형식이어야 합니다.")
    );
  }

  if (isValidHttpsUrl(supabaseUrl) && anonKey) {
    const publicRead = await requestSupabase(
      supabaseUrl,
      anonKey,
      "/rest/v1/site_settings?select=key&limit=1"
    );
    checks.push(
      check(
        "supabase:public_read",
        publicRead.ok,
        publicRead.ok ? undefined : `HTTP ${publicRead.status}${publicRead.error ? ` ${publicRead.error}` : ""}`
      )
    );
  }

  if (deep && isValidHttpsUrl(supabaseUrl) && serviceRoleKey) {
    const tables = [
      "admin_profiles",
      "site_settings",
      "content_pages",
      "content_blocks",
      "recruitment_cycles",
      "activity_items",
      "achievement_items",
      "history_entries",
      "faq_items",
      "media_assets",
      "audit_logs",
      "applicants",
    ];

    for (const table of tables) {
      const result = await requestSupabase(supabaseUrl, serviceRoleKey, `/rest/v1/${table}?select=*&limit=1`);
      checks.push(check(`table:${table}`, result.ok, result.ok ? undefined : `HTTP ${result.status}`));
    }

    const buckets = await requestSupabase(supabaseUrl, serviceRoleKey, "/storage/v1/bucket");
    checks.push(check("storage:buckets", buckets.ok, buckets.ok ? undefined : `HTTP ${buckets.status}`));
  }

  const result = {
    ok: checks.every((item) => item.ok),
    envFile,
    checks,
  };

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const item of checks) {
      console.log(`${item.ok ? "ok" : "fail"} ${item.name}${item.message ? ` ${item.message}` : ""}`);
    }
    console.log(`${result.ok ? "Supabase env check passed" : "Supabase env check failed"}: ${checks.filter((item) => item.ok).length}/${checks.length}`);
  }

  if (!result.ok) process.exit(1);
}

await main();
