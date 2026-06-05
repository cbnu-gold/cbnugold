import type { Applicant } from "@/types";

export type RecruitingFunnelStage = {
  key: Applicant["status"] | "total" | "active_pipeline" | "decisioned";
  label: string;
  count: number;
  rate: number;
};

export type RecruitingFunnelReport = {
  total: number;
  reviewRate: number;
  interviewRate: number;
  decisionRate: number;
  acceptanceRate: number;
  stages: RecruitingFunnelStage[];
};

function rate(count: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

export function buildRecruitingFunnelReport(applicants: Pick<Applicant, "status">[]): RecruitingFunnelReport {
  const counts = applicants.reduce<Record<Applicant["status"], number>>(
    (acc, applicant) => {
      acc[applicant.status] += 1;
      return acc;
    },
    {
      pending: 0,
      reviewed: 0,
      interview: 0,
      accepted: 0,
      rejected: 0,
    }
  );
  const total = applicants.length;
  const reviewedOrLater = counts.reviewed + counts.interview + counts.accepted + counts.rejected;
  const activePipeline = counts.pending + counts.reviewed + counts.interview;
  const decisioned = counts.accepted + counts.rejected;

  return {
    total,
    reviewRate: rate(reviewedOrLater, total),
    interviewRate: rate(counts.interview + counts.accepted + counts.rejected, total),
    decisionRate: rate(decisioned, total),
    acceptanceRate: rate(counts.accepted, decisioned),
    stages: [
      { key: "total", label: "전체 접수", count: total, rate: 100 },
      { key: "pending", label: "검토 대기", count: counts.pending, rate: rate(counts.pending, total) },
      { key: "reviewed", label: "서류 검토", count: counts.reviewed, rate: rate(counts.reviewed, total) },
      { key: "interview", label: "면접 대상", count: counts.interview, rate: rate(counts.interview, total) },
      { key: "accepted", label: "합격", count: counts.accepted, rate: rate(counts.accepted, total) },
      { key: "rejected", label: "불합격", count: counts.rejected, rate: rate(counts.rejected, total) },
      { key: "active_pipeline", label: "진행 중", count: activePipeline, rate: rate(activePipeline, total) },
      { key: "decisioned", label: "결과 확정", count: decisioned, rate: rate(decisioned, total) },
    ],
  };
}
