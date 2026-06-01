#!/usr/bin/env node

const rawArgs = process.argv.slice(2);
const allowDegraded = rawArgs.includes("--allow-degraded");
const deep = rawArgs.includes("--deep");
const tokenArg = rawArgs.find((arg) => arg.startsWith("--token="));
const healthcheckToken = tokenArg?.slice("--token=".length) ?? process.env.HEALTHCHECK_TOKEN;
const targetArg = rawArgs.find((arg) => !arg.startsWith("--"));
const baseUrl = (targetArg ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

const checks = [
  { path: "/", method: "GET", expected: 200 },
  { path: "/about", method: "GET", expected: 200 },
  { path: "/activity", method: "GET", expected: 200 },
  { path: "/join", method: "GET", expected: 200 },
  { path: "/join/check", method: "GET", expected: 200 },
  { path: "/admin/login", method: "GET", expected: 200 },
  { path: "/robots.txt", method: "GET", expected: 200 },
  { path: "/sitemap.xml", method: "GET", expected: 200 },
  { path: "/wiki", method: "GET", expected: 404 },
  { path: "/api/admin/cms/settings", method: "GET", expected: 401 },
  { path: "/api/admin/applicants", method: "GET", expected: 401 },
  { path: "/api/admin/cms/admins", method: "GET", expected: 401 },
  { path: "/api/admin/cms/audit", method: "GET", expected: 401 },
  {
    path: "/api/admin/cms/settings",
    method: "POST",
    expected: 401,
    headers: { "content-type": "application/json" },
    body: "not-json",
  },
  {
    path: "/api/admin/applicants",
    method: "PATCH",
    expected: 401,
    headers: { "content-type": "application/json" },
    body: "not-json",
  },
  {
    path: "/api/admin/cms/media",
    method: "POST",
    expected: 401,
    headers: { "content-type": "application/json" },
    body: "not-json",
  },
  {
    path: "/api/admin/media/not-a-real-id",
    method: "PATCH",
    expected: 401,
    headers: { "content-type": "application/json" },
    body: "not-json",
  },
  {
    path: "/api/apply/check",
    method: "POST",
    expected: 400,
    headers: { "content-type": "application/json" },
    body: "not-json",
  },
  {
    path: "/api/apply",
    method: "POST",
    expected: 400,
    body: (() => {
      const form = new FormData();
      form.set("name", "홍길동");
      form.set("studentId", "2021123456");
      form.set("email", "hong@example.com");
      form.set("phone", "01012345678");
      form.set("file", new Blob(["not a pdf"], { type: "image/png" }), "application.pdf");
      return form;
    })(),
  },
];

const headerChecks = [
  {
    path: "/",
    method: "GET",
    expected: "security headers",
    headers: [
      ["x-content-type-options", "nosniff"],
      ["x-frame-options", "DENY"],
      ["referrer-policy", "strict-origin-when-cross-origin"],
      ["cross-origin-opener-policy", "same-origin"],
      ["x-permitted-cross-domain-policies", "none"],
      ["permissions-policy", "camera=()"],
      ["content-security-policy", "frame-ancestors 'none'"],
    ],
  },
  {
    path: "/admin/login",
    method: "GET",
    expected: "admin no-store",
    headers: [["cache-control", "no-store"]],
  },
  {
    path: "/api/admin/applicants",
    method: "GET",
    expected: "admin API no-store",
    headers: [["cache-control", "no-store"]],
  },
];

async function request(check) {
  const response = await fetch(`${baseUrl}${check.path}`, {
    method: check.method,
    headers: check.headers,
    body: check.body,
  });

  return {
    path: check.path,
    expected: check.expected,
    actual: response.status,
    ok: response.status === check.expected,
  };
}

async function requestHealth() {
  const healthPath = deep ? "/api/health?deep=1" : "/api/health";
  const response = await fetch(`${baseUrl}${healthPath}`, {
    cache: "no-store",
    headers: healthcheckToken ? { "x-healthcheck-token": healthcheckToken } : undefined,
  });
  const body = await response.json().catch(() => null);
  const status = body?.status ?? "unknown";

  return {
    path: healthPath,
    expected: allowDegraded ? "200 or 503" : 200,
    actual: response.status,
    ok: allowDegraded ? [200, 503].includes(response.status) : response.status === 200,
    healthStatus: status,
    failedChecks: Array.isArray(body?.checks)
      ? body.checks.filter((check) => !check.ok).length
      : null,
  };
}

async function requestHeaders(check) {
  const response = await fetch(`${baseUrl}${check.path}`, {
    method: check.method,
    cache: "no-store",
  });

  const missing = check.headers.filter(([name, expected]) => {
    const value = response.headers.get(name) ?? "";
    return !value.toLowerCase().includes(expected.toLowerCase());
  });

  return {
    path: check.path,
    expected: check.expected,
    actual: response.status,
    ok: missing.length === 0,
    missingHeaders: missing.map(([name]) => name),
  };
}

const results = [];
for (const check of checks) {
  results.push(await request(check));
}
for (const check of headerChecks) {
  results.push(await requestHeaders(check));
}
results.push(await requestHealth());

const failed = results.filter((result) => !result.ok);
const protectedDeployment =
  results.length > 0 && results.every((result) => result.actual === 401);

for (const result of results) {
  const extra =
    result.path === "/api/health" || result.path === "/api/health?deep=1"
      ? ` status=${result.healthStatus} failedChecks=${result.failedChecks ?? "-"}`
      : result.missingHeaders?.length
        ? ` missingHeaders=${result.missingHeaders.join(",")}`
      : "";
  console.log(
    `${result.ok ? "ok" : "fail"} ${result.path} expected=${result.expected} actual=${result.actual}${extra}`
  );
}

if (failed.length > 0) {
  if (protectedDeployment) {
    console.error(
      "All checks returned 401. This deployment is likely protected by Vercel. Use a public production URL, disable preview protection for this check, or verify previews with `vercel curl`."
    );
  }
  if (deep && results.some((result) => result.path === "/api/health?deep=1" && result.actual === 401)) {
    console.error(
      "Deep health check returned 401. Set HEALTHCHECK_TOKEN in Vercel and pass it with `--token=<value>` or the local HEALTHCHECK_TOKEN environment variable."
    );
  }
  console.error(`Operational check failed: ${failed.length}/${results.length}`);
  process.exit(1);
}

console.log(`Operational check passed: ${results.length}/${results.length}`);
