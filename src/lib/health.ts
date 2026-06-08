export type HealthStatus = "ok" | "degraded";

export type HealthCheck = {
  name: string;
  ok: boolean;
  message?: string;
};

export function getHealthStatus(checks: HealthCheck[]): HealthStatus {
  return checks.every((check) => check.ok) ? "ok" : "degraded";
}

export function isValidHttpsUrl(value: string | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function isLikelyJwt(value: string | undefined) {
  if (!value) return false;
  return value.split(".").length === 3;
}

function getErrorCauseMessage(error: Error) {
  const cause = error.cause;
  if (!cause || typeof cause !== "object") return "";

  const message =
    "message" in cause && typeof cause.message === "string"
      ? cause.message
      : "";
  const code =
    "code" in cause && typeof cause.code === "string"
      ? cause.code
      : "";

  return [message, code].filter(Boolean).join(" ");
}

export function sanitizeHealthError(error: unknown) {
  if (error instanceof Error) {
    const details = `${error.message} ${getErrorCauseMessage(error)}`;
    if (
      details.includes("ENOTFOUND") ||
      details.includes("getaddrinfo") ||
      details.includes("could not be resolved")
    ) {
      return "Supabase 호스트를 찾을 수 없습니다";
    }
    if (details.includes("fetch failed")) return "Supabase에 연결할 수 없습니다";
    if (details.includes("Failed to fetch")) return "Supabase에 연결할 수 없습니다";
    return error.message.slice(0, 120);
  }

  return "알 수 없는 오류";
}
