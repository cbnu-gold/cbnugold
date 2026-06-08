import type { SiteSettingsValue } from "@/types";

export type SiteSettingsImpactItem = {
  key: string;
  title: string;
  fields: Array<keyof SiteSettingsValue>;
  surfaces: string[];
  detail: string;
};

export function buildSiteSettingsImpactReport(settings: SiteSettingsValue): SiteSettingsImpactItem[] {
  return [
    {
      key: "identity",
      title: "정체성·검색 정보",
      fields: ["site_title", "club_name", "organization_type", "founded_label", "brand_statement"],
      surfaces: ["홈", "소개", "헤더", "푸터", "검색·공유 메타"],
      detail: `${settings.club_name}의 이름, 단체 유형, 시작 표기, 운영 철학에 반영됩니다.`,
    },
    {
      key: "brand-assets",
      title: "브랜드·시각 자산",
      fields: ["brand_preset", "logo_url", "share_image_url"],
      surfaces: ["전체 공개 페이지", "홈 키비주얼", "SNS 공유 카드", "브라우저 아이콘"],
      detail: `${settings.brand_preset} 테마와 로고·공유 이미지가 공개 화면의 첫인상을 결정합니다.`,
    },
    {
      key: "public-actions",
      title: "CTA·공개 이동",
      fields: ["primary_cta_label", "primary_cta_href", "secondary_cta_label", "secondary_cta_href"],
      surfaces: ["홈 첫 화면", "헤더 지원 버튼", "모집 안내 섹션"],
      detail: `주요 행동은 ${settings.primary_cta_label} → ${settings.primary_cta_href} 흐름으로 연결됩니다.`,
    },
    {
      key: "contact-channels",
      title: "문의·외부 채널",
      fields: ["contact_name", "contact_phone", "contact_email", "instagram_url", "naver_cafe_url"],
      surfaces: ["지원 페이지", "푸터", "모집 홍보 패키지", "지원자 문의 흐름"],
      detail: `${settings.contact_name} 담당자와 공개 문의 채널에 반영됩니다.`,
    },
  ];
}

export function buildSiteSettingsImpactBrief(items: SiteSettingsImpactItem[]) {
  return [
    "# 사이트 설정 영향 범위",
    ...items.flatMap((item) => [
      "",
      `## ${item.title}`,
      `- 필드: ${item.fields.join(", ")}`,
      `- 공개 표면: ${item.surfaces.join(", ")}`,
      `- 확인: ${item.detail}`,
    ]),
  ].join("\n");
}
