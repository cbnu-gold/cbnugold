#!/usr/bin/env node

const rawArgs = process.argv.slice(2);
const allowDegraded = rawArgs.includes("--allow-degraded");
const targetArg = rawArgs.find((arg) => !arg.startsWith("--"));
const baseUrl = (targetArg ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

const checks = [
  { path: "/", method: "GET", expected: 200 },
  { path: "/about", method: "GET", expected: 200 },
  { path: "/activity", method: "GET", expected: 200 },
  { path: "/join", method: "GET", expected: 200 },
  { path: "/join/check", method: "GET", expected: 200 },
  { path: "/admin/login", method: "GET", expected: 200 },
  { path: "/wiki", method: "GET", expected: 404 },
  { path: "/api/admin/cms/settings", method: "GET", expected: 401 },
  {
    path: "/api/apply/check",
    method: "POST",
    expected: 400,
    headers: { "content-type": "application/json" },
    body: "not-json",
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
  const response = await fetch(`${baseUrl}/api/health`, { cache: "no-store" });
  const body = await response.json().catch(() => null);
  const status = body?.status ?? "unknown";

  return {
    path: "/api/health",
    expected: allowDegraded ? "200 or 503" : 200,
    actual: response.status,
    ok: allowDegraded ? [200, 503].includes(response.status) : response.status === 200,
    healthStatus: status,
    failedChecks: Array.isArray(body?.checks)
      ? body.checks.filter((check) => !check.ok).length
      : null,
  };
}

const results = [];
for (const check of checks) {
  results.push(await request(check));
}
results.push(await requestHealth());

const failed = results.filter((result) => !result.ok);
const protectedDeployment =
  results.length > 0 && results.every((result) => result.actual === 401);

for (const result of results) {
  const extra =
    result.path === "/api/health"
      ? ` status=${result.healthStatus} failedChecks=${result.failedChecks ?? "-"}`
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
  console.error(`Operational check failed: ${failed.length}/${results.length}`);
  process.exit(1);
}

console.log(`Operational check passed: ${results.length}/${results.length}`);
