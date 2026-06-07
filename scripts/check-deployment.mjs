#!/usr/bin/env node

const rawArgs = process.argv.slice(2);
const jsonOutput = rawArgs.includes("--json");
const allowPending = rawArgs.includes("--allow-pending");

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  return rawArgs.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function normalizeUrl(value) {
  return value.replace(/\/$/, "");
}

const canonicalUrl = normalizeUrl(getArg("canonical", process.env.CANONICAL_SITE_URL ?? "https://cbnugold.com"));
const fallbackUrl = normalizeUrl(getArg("fallback", process.env.VERCEL_SITE_URL ?? "https://cbnugold.vercel.app"));

function isVercel(headers) {
  const server = headers.get("server") ?? "";
  return Boolean(headers.get("x-vercel-id") || headers.get("x-vercel-cache") || /vercel/i.test(server));
}

function isWix(headers) {
  const server = headers.get("server") ?? "";
  return Boolean(headers.get("x-wix-request-id") || /pepyaka|wix/i.test(server));
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timeout);
  }
}

async function inspectHome(baseUrl) {
  try {
    const response = await fetchWithTimeout(baseUrl, { method: "GET", redirect: "follow" });
    return {
      ok: response.status === 200 && isVercel(response.headers),
      status: response.status,
      server: response.headers.get("server") ?? "",
      vercel: isVercel(response.headers),
      wix: isWix(response.headers),
      matchedPath: response.headers.get("x-matched-path") ?? "",
    };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      server: "",
      vercel: false,
      wix: false,
      matchedPath: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function inspectHealth(baseUrl) {
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/health`, {
      method: "GET",
      headers: { accept: "application/json" },
    });
    const body = await response.json().catch(() => null);
    const failedChecks = Array.isArray(body?.checks)
      ? body.checks.filter((check) => !check.ok)
      : [];

    return {
      ok: response.status === 200 && body?.status === "ok",
      status: response.status,
      healthStatus: body?.status ?? "unknown",
      failedChecks: failedChecks.map((check) => check.message ? `${check.name}:${check.message}` : check.name),
    };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      healthStatus: "unknown",
      failedChecks: [error instanceof Error ? error.message : String(error)],
    };
  }
}

async function inspectTarget(label, baseUrl) {
  const [home, health] = await Promise.all([inspectHome(baseUrl), inspectHealth(baseUrl)]);

  return {
    label,
    url: baseUrl,
    home,
    health,
    ready: home.ok && health.ok,
  };
}

const [canonical, fallback] = await Promise.all([
  inspectTarget("canonical", canonicalUrl),
  inspectTarget("fallback", fallbackUrl),
]);

const result = {
  checkedAt: new Date().toISOString(),
  canonical,
  fallback,
  ready: canonical.ready,
  fallbackReady: fallback.ready,
};

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else {
  for (const target of [canonical, fallback]) {
    const homeNotes = [
      target.home.vercel ? "vercel" : null,
      target.home.wix ? "wix" : null,
      target.home.matchedPath ? `path=${target.home.matchedPath}` : null,
    ].filter(Boolean).join(" ");
    const healthNotes = target.health.failedChecks.length > 0
      ? ` failed=${target.health.failedChecks.join("|")}`
      : "";

    console.log(
      `${target.ready ? "ok" : "fail"} ${target.label} ${target.url} ` +
        `home=${target.home.status} ${homeNotes} ` +
        `health=${target.health.status}/${target.health.healthStatus}${healthNotes}`
    );
  }

  if (!canonical.home.vercel && canonical.home.wix) {
    console.error("canonical domain still points to Wix/Pepyaka. DNS or Vercel domain assignment is not complete.");
  } else if (!canonical.home.vercel) {
    console.error("canonical domain does not appear to be served by Vercel.");
  }

  if (!canonical.health.ok) {
    console.error("canonical health check is not ok. Verify Vercel env, Supabase URL/key, RLS, and storage setup.");
  }
}

if (!result.ready && !allowPending) {
  process.exit(1);
}
