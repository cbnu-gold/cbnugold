import type { SiteReadinessStatus } from "@/lib/site-readiness";

type HealthInput = {
  status?: string;
  checks?: Array<{ ok: boolean; name: string; message?: string }>;
} | null;

type StatusInput = {
  status: SiteReadinessStatus;
};

type ReadinessInput = StatusInput & {
  score: number;
};

export type LaunchReadinessItem = {
  key: string;
  title: string;
  status: SiteReadinessStatus;
  detail: string;
  actionLabel: string;
  target: "health" | "readiness" | "freshness" | "recruitment";
};

export type LaunchReadinessReport = {
  status: SiteReadinessStatus;
  label: string;
  items: LaunchReadinessItem[];
};

const itemStatusLabels: Record<SiteReadinessStatus, string> = {
  pass: "통과",
  warning: "검토",
  fail: "보류",
};

function getReportStatus(items: LaunchReadinessItem[]): SiteReadinessStatus {
  if (items.some((item) => item.status === "fail")) return "fail";
  if (items.some((item) => item.status === "warning")) return "warning";
  return "pass";
}

function getLabel(status: SiteReadinessStatus) {
  if (status === "pass") return "전환 가능";
  if (status === "warning") return "검토 후 전환";
  return "전환 보류";
}

export function buildLaunchReadinessReport({
  health,
  readiness,
  freshness,
  recruitment,
}: {
  health: HealthInput;
  readiness: ReadinessInput;
  freshness: StatusInput;
  recruitment: StatusInput;
}): LaunchReadinessReport {
  const failedHealthCount = health?.checks?.filter((check) => !check.ok).length ?? 0;
  const healthStatus: SiteReadinessStatus =
    health?.status === "ok" ? "pass" : health ? "fail" : "warning";

  const items: LaunchReadinessItem[] = [
    {
      key: "runtime-health",
      title: "배포·DB 연결",
      status: healthStatus,
      detail:
        healthStatus === "pass"
          ? "운영 health가 정상입니다."
          : health
            ? `운영 health 실패 항목 ${failedHealthCount}개가 있습니다.`
            : "운영 health를 아직 확인하지 않았습니다.",
      actionLabel: "운영 상태 확인",
      target: "health",
    },
    {
      key: "cms-readiness",
      title: "CMS 준비도",
      status: readiness.status,
      detail: `운영 준비도 점수는 ${readiness.score}%입니다.`,
      actionLabel: "준비도 확인",
      target: "readiness",
    },
    {
      key: "content-freshness",
      title: "콘텐츠 최신성",
      status: freshness.status,
      detail:
        freshness.status === "pass"
          ? "공개 콘텐츠 최신성 기준을 충족합니다."
          : "모집, 핵심 페이지, 성과, FAQ, 미디어 검토가 필요합니다.",
      actionLabel: "최신성 확인",
      target: "freshness",
    },
    {
      key: "recruitment-operations",
      title: "모집 운영",
      status: recruitment.status,
      detail:
        recruitment.status === "pass"
          ? "모집 상태, 일정, 양식, 개인정보 고지가 준비되어 있습니다."
          : "모집 상태, 일정, 양식, 지원 자격, 개인정보 고지를 다시 확인해야 합니다.",
      actionLabel: "모집 확인",
      target: "recruitment",
    },
  ];

  const status = getReportStatus(items);
  return {
    status,
    label: getLabel(status),
    items,
  };
}

export function buildLaunchReadinessBrief(report: LaunchReadinessReport) {
  const actionItems = report.items.filter((item) => item.status !== "pass");

  return [
    "# 운영 전환 브리프",
    `판정: ${report.label}`,
    "",
    "## 핵심 점검",
    ...report.items.map(
      (item) => `- [${itemStatusLabels[item.status]}] ${item.title}: ${item.detail}`
    ),
    "",
    "## 다음 조치",
    ...(actionItems.length
      ? actionItems.map((item) => `- ${item.actionLabel}: ${item.title}`)
      : ["- 추가 보완 조치 없음. 도메인 전환과 모집 홍보를 진행할 수 있습니다."]),
    "",
    "지원자 개인정보, 관리자 계정 정보, 비공개 지원서 파일 정보는 포함하지 않았습니다.",
  ].join("\n");
}
