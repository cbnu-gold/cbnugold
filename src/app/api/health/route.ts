import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  getHealthStatus,
  isLikelyJwt,
  isValidHttpsUrl,
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

function wantsDeepCheck(request: NextRequest) {
  return request.nextUrl.searchParams.get("deep") === "1";
}

function isDeepCheckAuthorized(request: NextRequest) {
  const configuredToken = process.env.HEALTHCHECK_TOKEN;
  if (!configuredToken) return false;

  const token =
    request.headers.get("x-healthcheck-token") ??
    request.nextUrl.searchParams.get("token");

  return token === configuredToken;
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

async function checkSupabaseReachability(
  supabaseUrl: string,
  anonKey: string
): Promise<HealthCheck> {
  try {
    const response = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/site_settings?select=key&limit=1`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      }
    );

    return {
      name: "supabase:public_read",
      ok: response.ok,
      message: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      name: "supabase:public_read",
      ok: false,
      message: sanitizeHealthError(error),
    };
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
  const deep = wantsDeepCheck(request);
  const deepAuthorized = isDeepCheckAuthorized(request);
  const supabaseUrlFormatOk = isValidHttpsUrl(supabaseUrl);
  const anonKeyFormatOk = isLikelyJwt(anonKey);
  const serviceKeyFormatOk = isLikelyJwt(serviceKey);

  if (deep && !deepAuthorized) {
    return NextResponse.json(
      {
        status: "degraded",
        checkedAt: new Date().toISOString(),
        checks: [
          {
            name: "deep_check_authorized",
            ok: false,
            message: "심층 점검 권한이 필요합니다",
          },
        ],
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const checks: HealthCheck[] = [
    {
      name: "env:supabase_url",
      ok: Boolean(supabaseUrl),
    },
    {
      name: "env:supabase_url_format",
      ok: supabaseUrlFormatOk,
      message: supabaseUrlFormatOk
        ? undefined
        : supabaseUrl
          ? "NEXT_PUBLIC_SUPABASE_URL은 https URL이어야 합니다"
          : "NEXT_PUBLIC_SUPABASE_URL이 필요합니다",
    },
    {
      name: "env:supabase_anon_key",
      ok: Boolean(anonKey),
    },
    {
      name: "env:supabase_anon_key_format",
      ok: anonKeyFormatOk,
      message: anonKeyFormatOk
        ? undefined
        : anonKey
          ? "NEXT_PUBLIC_SUPABASE_ANON_KEY 형식을 확인해야 합니다"
          : "NEXT_PUBLIC_SUPABASE_ANON_KEY가 필요합니다",
    },
  ];

  if (supabaseUrl && supabaseUrlFormatOk && anonKey) {
    const normalizedUrl = supabaseUrl.replace(/\/$/, "");
    checks.push(await checkSupabaseReachability(normalizedUrl, anonKey));
  }

  if (deep) {
    checks.push({
      name: "env:supabase_service_role_key",
      ok: Boolean(serviceKey),
    });
    checks.push({
      name: "env:supabase_service_role_key_format",
      ok: serviceKeyFormatOk,
      message: serviceKeyFormatOk
        ? undefined
        : serviceKey
          ? "SUPABASE_SERVICE_ROLE_KEY 형식을 확인해야 합니다"
          : "SUPABASE_SERVICE_ROLE_KEY가 필요합니다",
    });
  }

  if (deep && supabaseUrl && supabaseUrlFormatOk && serviceKey) {
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
