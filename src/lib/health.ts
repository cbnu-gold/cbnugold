export type HealthStatus = "ok" | "degraded";

export type HealthCheck = {
  name: string;
  ok: boolean;
  message?: string;
};

export function getHealthStatus(checks: HealthCheck[]): HealthStatus {
  return checks.every((check) => check.ok) ? "ok" : "degraded";
}

export function sanitizeHealthError(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("fetch failed")) return "Supabase에 연결할 수 없습니다";
    if (error.message.includes("Failed to fetch")) return "Supabase에 연결할 수 없습니다";
    if (error.message.includes("ENOTFOUND")) return "Supabase 호스트를 찾을 수 없습니다";
    return error.message.slice(0, 120);
  }

  return "알 수 없는 오류";
}
