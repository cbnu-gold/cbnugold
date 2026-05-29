import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  getHealthStatus,
  sanitizeHealthError,
  type HealthCheck,
} from "@/lib/health";

export const dynamic = "force-dynamic";

const expectedTables = [
  ["admin_profiles", "id"],
  ["site_settings", "key"],
  ["content_pages", "id"],
  ["content_blocks", "id"],
  ["recruitment_cycles", "id"],
  ["activity_items", "id"],
  ["achievement_items", "id"],
  ["history_entries", "id"],
  ["faq_items", "id"],
  ["media_assets", "id"],
  ["audit_logs", "id"],
  ["applicants", "id"],
] as const;

function getOrigin(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 4500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkSupabaseTable(
  supabaseUrl: string,
  serviceKey: string,
  table: string,
  column: string
): Promise<HealthCheck> {
  try {
    const response = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/${table}?select=${column}&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );

    return {
      name: `table:${table}`,
      ok: response.ok,
      message: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      name: `table:${table}`,
      ok: false,
      message: sanitizeHealthError(error),
    };
  }
}

async function checkStorageBuckets(
  supabaseUrl: string,
  serviceKey: string
): Promise<HealthCheck[]> {
  try {
    const response = await fetchWithTimeout(`${supabaseUrl}/storage/v1/bucket`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    if (!response.ok) {
      return [
        {
          name: "storage:applications",
          ok: false,
          message: `HTTP ${response.status}`,
        },
        {
          name: "storage:cms-media",
          ok: false,
          message: `HTTP ${response.status}`,
        },
      ];
    }

    const buckets = (await response.json()) as Array<{ name?: string; public?: boolean }>;
    const applications = buckets.find((bucket) => bucket.name === "applications");
    const cmsMedia = buckets.find((bucket) => bucket.name === "cms-media");

    return [
      {
        name: "storage:applications",
        ok: Boolean(applications && applications.public === false),
        message: applications ? undefined : "applications 버킷이 없습니다",
      },
      {
        name: "storage:cms-media",
        ok: Boolean(cmsMedia && cmsMedia.public === true),
        message: cmsMedia ? undefined : "cms-media 버킷이 없습니다",
      },
    ];
  } catch (error) {
    const message = sanitizeHealthError(error);
    return [
      { name: "storage:applications", ok: false, message },
      { name: "storage:cms-media", ok: false, message },
    ];
  }
}

export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(`health:${getOrigin(request)}`, 20, 60_000);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { status: "degraded", checks: [{ name: "rate_limit", ok: false }] },
      { status: 429 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const checks: HealthCheck[] = [
    {
      name: "env:NEXT_PUBLIC_SUPABASE_URL",
      ok: Boolean(supabaseUrl),
    },
    {
      name: "env:NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ok: Boolean(anonKey),
    },
    {
      name: "env:SUPABASE_SERVICE_ROLE_KEY",
      ok: Boolean(serviceKey),
    },
  ];

  if (supabaseUrl && serviceKey) {
    const normalizedUrl = supabaseUrl.replace(/\/$/, "");
    checks.push(
      ...(await Promise.all(
        expectedTables.map(([table, column]) =>
          checkSupabaseTable(normalizedUrl, serviceKey, table, column)
        )
      ))
    );
    checks.push(...(await checkStorageBuckets(normalizedUrl, serviceKey)));
  }

  const status = getHealthStatus(checks);

  return NextResponse.json(
    {
      status,
      checkedAt: new Date().toISOString(),
      checks,
    },
    {
      status: status === "ok" ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
