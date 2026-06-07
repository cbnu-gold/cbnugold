import type { RecruitmentCycle, SiteSettingsValue } from "@/types";
import { toAbsoluteSiteUrl } from "@/lib/seo";
import { buildRecruitmentOperationReport } from "@/lib/recruitment-operations";
import { formatKoreanDateTime } from "@/lib/recruitment";

export type RecruitmentShareKit = {
  title: string;
  statusLabel: string;
  body: string;
  links: { label: string; href: string }[];
  warnings: string[];
};

function appendLink(links: RecruitmentShareKit["links"], label: string, href: string | null | undefined) {
  if (!href?.trim()) return;
  links.push({ label, href: toAbsoluteSiteUrl(href) });
}

export function buildRecruitmentShareKit(
  settings: SiteSettingsValue,
  recruitment: RecruitmentCycle[],
  now = new Date()
): RecruitmentShareKit {
  const operations = buildRecruitmentOperationReport(recruitment, now);
  const cycle = operations.cycle;
  const joinUrl = toAbsoluteSiteUrl(settings.primary_cta_href || "/join");
  const checkUrl = toAbsoluteSiteUrl("/join/check");
  const title = cycle ? `${settings.site_title} ${cycle.generation}기 모집 안내` : `${settings.site_title} 모집 안내`;
  const links: RecruitmentShareKit["links"] = [
    { label: "지원 안내", href: joinUrl },
    { label: "지원 확인", href: checkUrl },
  ];
  const warnings: string[] = [];

  if (settings.instagram_url) appendLink(links, "Instagram", settings.instagram_url);
  if (settings.naver_cafe_url) appendLink(links, "Naver Cafe", settings.naver_cafe_url);

  if (!cycle) {
    warnings.push("공개하거나 준비 중인 모집 기수가 없습니다.");
    return {
      title,
      statusLabel: operations.phaseLabel,
      body: [
        settings.club_name,
        settings.hero_subtitle,
        "",
        `지원 안내: ${joinUrl}`,
        `문의: ${settings.contact_name} · ${settings.contact_email}`,
      ].join("\n"),
      links,
      warnings,
    };
  }

  if (operations.status !== "pass") {
    warnings.push(...operations.items.filter((item) => item.status !== "pass").map((item) => item.detail));
  }

  appendLink(links, "DOCX 지원서", cycle.docx_url);
  appendLink(links, "HWP 지원서", cycle.hwp_url);

  const scheduleLines = [
    `접수: ${formatKoreanDateTime(cycle.start_at)} - ${formatKoreanDateTime(cycle.end_at)}`,
    `서류 발표: ${formatKoreanDateTime(cycle.document_result_at)}`,
    `면접: ${formatKoreanDateTime(cycle.interview_at)}`,
    `최종 발표: ${formatKoreanDateTime(cycle.final_result_at)}`,
  ];
  const requirementText = cycle.requirements.length > 0 ? cycle.requirements.join(", ") : "지원 자격은 지원 안내 페이지에서 확인";

  return {
    title,
    statusLabel: operations.phaseLabel,
    body: [
      `${settings.club_name} ${cycle.generation}기 모집`,
      settings.hero_subtitle,
      "",
      ...scheduleLines,
      `지원 자격: ${requirementText}`,
      cycle.meeting_time ? `정규 활동: ${cycle.meeting_time}` : null,
      cycle.fee_note ? `회비: ${cycle.fee_note}` : null,
      "",
      `지원 안내: ${joinUrl}`,
      `지원 확인: ${checkUrl}`,
      `문의: ${settings.contact_name} · ${settings.contact_email}`,
    ]
      .filter(Boolean)
      .join("\n"),
    links,
    warnings,
  };
}
