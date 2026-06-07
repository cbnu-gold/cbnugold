import type { RecruitmentCycle } from "../types";

export type RecruitmentPhase = "open" | "scheduled" | "closed" | "paused";

export function isRecruitmentOpen(cycle: RecruitmentCycle, now = new Date()) {
  return getRecruitmentPhase(cycle, now) === "open";
}

export function getRecruitmentPhase(cycle: RecruitmentCycle, now = new Date()): RecruitmentPhase {
  if (cycle.status !== "published") return "paused";

  const current = now.getTime();
  const startsAt = cycle.start_at ? new Date(cycle.start_at).getTime() : null;
  const endsAt = cycle.end_at ? new Date(cycle.end_at).getTime() : null;

  if (endsAt && current > endsAt) return "closed";
  if (startsAt && current < startsAt) return "scheduled";
  if (!cycle.is_open) return "paused";
  return "open";
}

export function getRecruitmentPhaseLabel(phase: RecruitmentPhase) {
  const labels: Record<RecruitmentPhase, string> = {
    open: "모집 중",
    scheduled: "모집 예정",
    closed: "모집 마감",
    paused: "모집 준비 중",
  };

  return labels[phase];
}

export function formatKoreanDateTime(value: string | null) {
  if (!value) return "일정 별도 안내";

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
