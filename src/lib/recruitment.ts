import type { RecruitmentCycle } from "../types";

export function isRecruitmentOpen(cycle: RecruitmentCycle, now = new Date()) {
  if (!cycle.is_open || cycle.status !== "published") return false;
  if (!cycle.end_at) return true;
  return now.getTime() <= new Date(cycle.end_at).getTime();
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
