import type { RecruitmentCycle } from "@/types";
import { getRecruitmentPhase, getRecruitmentPhaseLabel, type RecruitmentPhase } from "@/lib/recruitment";
import type { SiteReadinessStatus } from "@/lib/site-readiness";

export type RecruitmentOperationItem = {
  key: string;
  title: string;
  status: SiteReadinessStatus;
  detail: string;
};

export type RecruitmentOperationReport = {
  cycle: RecruitmentCycle | null;
  phase: RecruitmentPhase | "none";
  phaseLabel: string;
  status: SiteReadinessStatus;
  daysUntilDeadline: number | null;
  items: RecruitmentOperationItem[];
};

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function getTime(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function getDaysUntil(value: string | null | undefined, now: Date) {
  const time = getTime(value);
  if (time === null) return null;
  return Math.ceil((time - now.getTime()) / (24 * 60 * 60 * 1000));
}

function pickPrimaryRecruitmentCycle(recruitment: RecruitmentCycle[], now: Date) {
  const published = recruitment.filter((cycle) => cycle.status === "published");
  const open = published.find((cycle) => getRecruitmentPhase(cycle, now) === "open");
  if (open) return open;

  const scheduled = published.find((cycle) => getRecruitmentPhase(cycle, now) === "scheduled");
  if (scheduled) return scheduled;

  return [...published, ...recruitment]
    .filter((cycle, index, list) => list.findIndex((item) => item.id === cycle.id && item.title === cycle.title) === index)
    .sort((a, b) => b.generation - a.generation)[0] ?? null;
}

export function buildRecruitmentOperationReport(
  recruitment: RecruitmentCycle[],
  now = new Date()
): RecruitmentOperationReport {
  const cycle = pickPrimaryRecruitmentCycle(recruitment, now);
  if (!cycle) {
    return {
      cycle: null,
      phase: "none",
      phaseLabel: "모집 없음",
      status: "fail",
      daysUntilDeadline: null,
      items: [
        {
          key: "cycle",
          title: "모집 기수",
          status: "fail",
          detail: "공개하거나 준비 중인 모집 기수가 없습니다.",
        },
      ],
    };
  }

  const phase = getRecruitmentPhase(cycle, now);
  const hasForms = hasText(cycle.docx_url) || hasText(cycle.hwp_url);
  const hasCoreSchedule = Boolean(cycle.start_at && cycle.end_at);
  const hasResultSchedule = Boolean(cycle.document_result_at && cycle.interview_at && cycle.final_result_at);
  const daysUntilDeadline = getDaysUntil(cycle.end_at, now);

  const items: RecruitmentOperationItem[] = [
    {
      key: "phase",
      title: "모집 상태",
      status: phase === "open" || phase === "scheduled" ? "pass" : phase === "closed" ? "warning" : "fail",
      detail: `${cycle.title}은 현재 ${getRecruitmentPhaseLabel(phase)} 상태입니다.`,
    },
    {
      key: "deadline",
      title: "접수 기간",
      status: hasCoreSchedule ? "pass" : "fail",
      detail: hasCoreSchedule
        ? daysUntilDeadline !== null && daysUntilDeadline >= 0
          ? `마감까지 ${daysUntilDeadline}일 남았습니다.`
          : "접수 마감일이 지났습니다."
        : "모집 시작일과 마감일을 모두 입력해야 합니다.",
    },
    {
      key: "results",
      title: "결과 일정",
      status: hasResultSchedule ? "pass" : "warning",
      detail: hasResultSchedule
        ? "서류 발표, 면접, 최종 발표 일정이 모두 입력되어 있습니다."
        : "서류 발표, 면접, 최종 발표 일정 중 비어 있는 항목이 있습니다.",
    },
    {
      key: "forms",
      title: "지원서 양식",
      status: hasForms ? "pass" : "warning",
      detail: hasForms ? "DOCX 또는 HWP 지원서 양식이 연결되어 있습니다." : "지원서 양식 URL을 연결해야 합니다.",
    },
    {
      key: "requirements",
      title: "지원 자격",
      status: cycle.requirements.length > 0 ? "pass" : "warning",
      detail:
        cycle.requirements.length > 0
          ? `지원 자격 ${cycle.requirements.length}개가 공개됩니다.`
          : "지원 자격 항목이 비어 있습니다.",
    },
    {
      key: "privacy",
      title: "개인정보 고지",
      status: hasText(cycle.privacy_retention) ? "pass" : "fail",
      detail: hasText(cycle.privacy_retention)
        ? "개인정보 보유 기간이 입력되어 있습니다."
        : "지원서 접수 전 개인정보 보유 기간을 입력해야 합니다.",
    },
  ];

  const status: SiteReadinessStatus = items.some((item) => item.status === "fail")
    ? "fail"
    : items.some((item) => item.status === "warning")
      ? "warning"
      : "pass";

  return {
    cycle,
    phase,
    phaseLabel: getRecruitmentPhaseLabel(phase),
    status,
    daysUntilDeadline,
    items,
  };
}
