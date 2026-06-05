import type {
  ActivityItem,
  AdminProfile,
  AchievementItem,
  ContentBlock,
  ContentPage,
  FAQItem,
  MediaAsset,
  RecruitmentCycle,
  SiteSettingsValue,
} from "@/types";

export type SiteReadinessStatus = "pass" | "warning" | "fail";

export type SiteReadinessItem = {
  key: string;
  title: string;
  status: SiteReadinessStatus;
  detail: string;
  actionLabel: string;
  targetTab:
    | "overview"
    | "applicants"
    | "recruitment"
    | "content"
    | "activities"
    | "achievements"
    | "history"
    | "faqs"
    | "media"
    | "admins"
    | "audit";
};

export type SiteReadinessInput = {
  settings: SiteSettingsValue;
  recruitment: RecruitmentCycle[];
  pages: ContentPage[];
  blocks: ContentBlock[];
  activities: ActivityItem[];
  achievements: AchievementItem[];
  faqs: FAQItem[];
  media: MediaAsset[];
  admins: AdminProfile[];
};

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function isSafeLogoOrImage(value: string) {
  return value.startsWith("/") || value.startsWith("https://");
}

function countPublished<T extends { status: string }>(items: T[]) {
  return items.filter((item) => item.status === "published").length;
}

function hasPublishedBlock(blocks: ContentBlock[], page: string, key: string) {
  return blocks.some((block) => block.status === "published" && block.page_slug === page && block.block_key === key);
}

function getActiveRecruitment(recruitment: RecruitmentCycle[]) {
  return recruitment.find((item) => item.status === "published" && item.is_open) ?? null;
}

function isOwner(profile: AdminProfile) {
  return profile.is_active && profile.role === "owner";
}

export function buildSiteReadinessReport(input: SiteReadinessInput): {
  score: number;
  status: SiteReadinessStatus;
  items: SiteReadinessItem[];
} {
  const activeRecruitment = getActiveRecruitment(input.recruitment);

  const items: SiteReadinessItem[] = [
    {
      key: "identity",
      title: "정체성 문구",
      status:
        hasText(input.settings.site_title) &&
        hasText(input.settings.organization_type) &&
        hasText(input.settings.hero_title) &&
        hasText(input.settings.hero_subtitle)
          ? "pass"
          : "fail",
      detail: "사이트명, 단체 유형, 홈 제목, 홈 설명이 공개 화면의 첫 인상을 만듭니다.",
      actionLabel: "설정 수정",
      targetTab: "content",
    },
    {
      key: "brand-assets",
      title: "브랜드 자산",
      status:
        isSafeLogoOrImage(input.settings.logo_url) && isSafeLogoOrImage(input.settings.share_image_url)
          ? "pass"
          : "warning",
      detail: "로고와 공유 이미지는 내부 경로 또는 https URL만 사용합니다.",
      actionLabel: "브랜드 설정",
      targetTab: "content",
    },
    {
      key: "core-pages",
      title: "공개 페이지",
      status: countPublished(input.pages) >= 4 ? "pass" : "warning",
      detail: `게시 상태 페이지 ${countPublished(input.pages)}개가 준비되어 있습니다.`,
      actionLabel: "페이지 확인",
      targetTab: "content",
    },
    {
      key: "core-blocks",
      title: "핵심 블록",
      status:
        hasPublishedBlock(input.blocks, "home", "hero") &&
        hasPublishedBlock(input.blocks, "home", "proof") &&
        hasPublishedBlock(input.blocks, "join", "first-semester")
          ? "pass"
          : "warning",
      detail: "홈 첫 화면, 2025년 성과, 지원 후 첫 학기 흐름 블록을 확인합니다.",
      actionLabel: "블록 확인",
      targetTab: "content",
    },
    {
      key: "recruitment",
      title: "모집 설정",
      status:
        activeRecruitment && activeRecruitment.end_at && activeRecruitment.privacy_retention
          ? "pass"
          : activeRecruitment
            ? "warning"
            : "fail",
      detail: activeRecruitment
        ? `${activeRecruitment.title} 모집이 공개 상태입니다.`
        : "공개 중인 모집 기수가 없습니다.",
      actionLabel: "모집 설정",
      targetTab: "recruitment",
    },
    {
      key: "activity-proof",
      title: "활동·성과 근거",
      status: countPublished(input.activities) >= 3 && countPublished(input.achievements) >= 3 ? "pass" : "warning",
      detail: `게시 활동 ${countPublished(input.activities)}개, 게시 성과 ${countPublished(input.achievements)}개입니다.`,
      actionLabel: "활동·성과 확인",
      targetTab: countPublished(input.activities) < 3 ? "activities" : "achievements",
    },
    {
      key: "support-info",
      title: "문의·FAQ",
      status: hasText(input.settings.contact_email) && countPublished(input.faqs) >= 3 ? "pass" : "warning",
      detail: `문의 이메일과 게시 FAQ ${countPublished(input.faqs)}개를 확인합니다.`,
      actionLabel: countPublished(input.faqs) >= 3 ? "문의 설정" : "FAQ 확인",
      targetTab: countPublished(input.faqs) >= 3 ? "content" : "faqs",
    },
    {
      key: "media",
      title: "미디어 관리",
      status: countPublished(input.media) >= 2 ? "pass" : "warning",
      detail: `게시 미디어 ${countPublished(input.media)}개가 등록되어 있습니다.`,
      actionLabel: "미디어 확인",
      targetTab: "media",
    },
    {
      key: "admin-owner",
      title: "관리자 권한",
      status: input.admins.some(isOwner) ? "pass" : "fail",
      detail: "활성 소유자 계정이 최소 1개 있어야 운영 권한을 잃지 않습니다.",
      actionLabel: "관리자 확인",
      targetTab: "admins",
    },
  ];

  const passCount = items.filter((item) => item.status === "pass").length;
  const failCount = items.filter((item) => item.status === "fail").length;
  const score = Math.round((passCount / items.length) * 100);
  const status: SiteReadinessStatus = failCount > 0 ? "fail" : score >= 80 ? "pass" : "warning";

  return { score, status, items };
}
