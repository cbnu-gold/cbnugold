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

export type SiteVerticalFitKey = "recruiting_club" | "academic_society" | "startup_team" | "event_program";

export type SiteVerticalFitItem = {
  key: SiteVerticalFitKey;
  title: string;
  score: number;
  status: Exclude<SiteReadinessStatus, "fail">;
  strengths: string[];
  gaps: string[];
  targetTab: SiteReadinessItem["targetTab"];
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
  canVerifyAdmins?: boolean;
};

export type ContentFreshnessItem = SiteReadinessItem;

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

function getPublished<T extends { status: string }>(items: T[]) {
  return items.filter((item) => item.status === "published");
}

function getTime(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function isOlderThan(value: string | null | undefined, now: Date, days: number) {
  const time = getTime(value);
  if (time === null) return true;
  return now.getTime() - time > days * 24 * 60 * 60 * 1000;
}

function isOwner(profile: AdminProfile) {
  return profile.is_active && profile.role === "owner";
}

function addScore(condition: boolean, points: number, strengths: string[], gaps: string[], strength: string, gap: string) {
  if (condition) {
    strengths.push(strength);
    return points;
  }
  gaps.push(gap);
  return 0;
}

export function buildSiteReadinessReport(input: SiteReadinessInput): {
  score: number;
  status: SiteReadinessStatus;
  items: SiteReadinessItem[];
} {
  const activeRecruitment = getActiveRecruitment(input.recruitment);
  const canVerifyAdmins = input.canVerifyAdmins ?? true;

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
      detail: "사이트명, 단체 유형, 홈 제목, 홈 설명은 첫 화면 신뢰도에 필요한 기본 정보입니다.",
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
      detail: "로고와 공유 이미지는 내부 경로 또는 https URL만 사용할 수 있습니다.",
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
      detail: activeRecruitment ? `${activeRecruitment.title} 모집이 공개 상태입니다.` : "공개 중인 모집 기수가 없습니다.",
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
      status: canVerifyAdmins ? (input.admins.some(isOwner) ? "pass" : "fail") : "warning",
      detail: canVerifyAdmins
        ? "활성 소유자 계정이 최소 1개 있어야 운영 권한이 끊기지 않습니다."
        : "현재 계정 권한으로는 owner 존재 여부를 확인할 수 없습니다.",
      actionLabel: canVerifyAdmins ? "관리자 확인" : "소유자에게 확인 요청",
      targetTab: canVerifyAdmins ? "admins" : "overview",
    },
  ];

  const passCount = items.filter((item) => item.status === "pass").length;
  const failCount = items.filter((item) => item.status === "fail").length;
  const score = Math.round((passCount / items.length) * 100);
  const status: SiteReadinessStatus = failCount > 0 ? "fail" : score >= 80 ? "pass" : "warning";

  return { score, status, items };
}

export function buildContentFreshnessReport(
  input: SiteReadinessInput,
  now = new Date()
): {
  status: SiteReadinessStatus;
  items: ContentFreshnessItem[];
} {
  const activeRecruitment = getActiveRecruitment(input.recruitment);
  const publishedPages = getPublished(input.pages);
  const publishedBlocks = getPublished(input.blocks);
  const publishedAchievements = getPublished(input.achievements);
  const publishedFaqs = getPublished(input.faqs);
  const publishedMedia = getPublished(input.media);
  const recruitmentEndTime = getTime(activeRecruitment?.end_at);
  const currentYear = now.getFullYear();

  const stalePages = publishedPages.filter((page) => isOlderThan(page.updated_at, now, 180));
  const requiredBlocks = [
    ["home", "hero"],
    ["home", "proof"],
    ["join", "first-semester"],
  ];
  const staleOrMissingBlocks = requiredBlocks.filter(([page, key]) => {
    const block = publishedBlocks.find((item) => item.page_slug === page && item.block_key === key);
    return !block || isOlderThan(block.updated_at, now, 180);
  });
  const recentAchievements = publishedAchievements.filter(
    (item) => typeof item.year === "number" && item.year >= currentYear - 1
  );
  const mediaWithoutAlt = publishedMedia.filter((item) => item.kind === "image" && !hasText(item.alt));
  const staleMedia = publishedMedia.filter((item) => isOlderThan(item.updated_at, now, 365));

  const items: ContentFreshnessItem[] = [
    {
      key: "fresh-recruitment",
      title: "모집 상태",
      status: activeRecruitment
        ? recruitmentEndTime !== null && recruitmentEndTime < now.getTime()
          ? "fail"
          : "pass"
        : "warning",
      detail: activeRecruitment
        ? recruitmentEndTime !== null && recruitmentEndTime < now.getTime()
          ? "모집 마감일이 지났지만 공개 모집이 열림 상태입니다."
          : "공개 모집 상태와 마감일이 운영 기준 안에 있습니다."
        : "공개 모집 기수가 없습니다. 모집 기간 전에는 닫힌 상태도 명확히 안내해야 합니다.",
      actionLabel: "모집 확인",
      targetTab: "recruitment",
    },
    {
      key: "fresh-pages",
      title: "공개 페이지",
      status: publishedPages.length >= 4 && stalePages.length === 0 ? "pass" : "warning",
      detail:
        stalePages.length > 0
          ? `최근 180일 기준으로 검토일 확인이 필요한 공개 페이지가 ${stalePages.length}개 있습니다.`
          : `공개 페이지 ${publishedPages.length}개가 최신성 기준을 충족합니다.`,
      actionLabel: "페이지 확인",
      targetTab: "content",
    },
    {
      key: "fresh-blocks",
      title: "핵심 블록",
      status: staleOrMissingBlocks.length === 0 ? "pass" : "warning",
      detail:
        staleOrMissingBlocks.length > 0
          ? `홈 첫 화면, 2025년 성과, 지원 첫 학기 흐름 중 ${staleOrMissingBlocks.length}개 블록의 검토가 필요합니다.`
          : "홈 첫 화면, 성과, 지원 흐름 블록이 최신성 기준을 충족합니다.",
      actionLabel: "블록 확인",
      targetTab: "content",
    },
    {
      key: "fresh-achievements",
      title: "성과 연도",
      status: recentAchievements.length > 0 ? "pass" : "warning",
      detail:
        recentAchievements.length > 0
          ? `최근 2년 기준 성과 ${recentAchievements.length}개가 공개되어 있습니다.`
          : "최근 2년 기준으로 공개된 성과가 없습니다. 2025년 성과 목록을 확인해야 합니다.",
      actionLabel: "성과 확인",
      targetTab: "achievements",
    },
    {
      key: "fresh-faqs",
      title: "지원 FAQ",
      status: publishedFaqs.length >= 3 ? "pass" : "warning",
      detail: `공개 FAQ ${publishedFaqs.length}개가 준비되어 있습니다. 지원 시즌 전 최소 3개 이상을 유지합니다.`,
      actionLabel: "FAQ 확인",
      targetTab: "faqs",
    },
    {
      key: "fresh-media",
      title: "미디어 설명",
      status: publishedMedia.length > 0 && mediaWithoutAlt.length === 0 && staleMedia.length === 0 ? "pass" : "warning",
      detail:
        mediaWithoutAlt.length > 0
          ? `대체텍스트가 비어 있는 공개 이미지가 ${mediaWithoutAlt.length}개 있습니다.`
          : staleMedia.length > 0
            ? `최근 1년 기준으로 검토가 필요한 미디어가 ${staleMedia.length}개 있습니다.`
            : `공개 미디어 ${publishedMedia.length}개가 최신성 기준을 충족합니다.`,
      actionLabel: "미디어 확인",
      targetTab: "media",
    },
  ];

  const status: SiteReadinessStatus = items.some((item) => item.status === "fail")
    ? "fail"
    : items.some((item) => item.status === "warning")
      ? "warning"
      : "pass";

  return { status, items };
}

export function buildSiteVerticalFitReport(input: SiteReadinessInput): SiteVerticalFitItem[] {
  const publishedPages = countPublished(input.pages);
  const publishedActivities = countPublished(input.activities);
  const publishedAchievements = countPublished(input.achievements);
  const publishedFaqs = countPublished(input.faqs);
  const publishedMedia = countPublished(input.media);
  const activeRecruitment = getActiveRecruitment(input.recruitment);
  const hasIdentity =
    hasText(input.settings.site_title) &&
    hasText(input.settings.organization_type) &&
    hasText(input.settings.hero_title) &&
    hasText(input.settings.hero_subtitle);
  const hasBrandAssets = isSafeLogoOrImage(input.settings.logo_url) && isSafeLogoOrImage(input.settings.share_image_url);
  const hasContact = hasText(input.settings.contact_email);

  const definitions: Array<{
    key: SiteVerticalFitKey;
    title: string;
    targetTab: SiteReadinessItem["targetTab"];
    checks: Array<[boolean, number, string, string]>;
  }> = [
    {
      key: "recruiting_club",
      title: "리크루팅형 동아리",
      targetTab: "recruitment",
      checks: [
        [Boolean(activeRecruitment), 30, "공개 모집 기수가 있습니다.", "공개 모집 기수가 필요합니다."],
        [publishedActivities >= 3, 20, "활동 근거가 충분합니다.", "활동 콘텐츠를 3개 이상 게시하세요."],
        [publishedAchievements >= 3, 20, "성과 근거가 충분합니다.", "성과 콘텐츠를 3개 이상 게시하세요."],
        [publishedFaqs >= 3, 15, "지원 FAQ가 준비되어 있습니다.", "지원 FAQ를 3개 이상 게시하세요."],
        [hasContact, 15, "문의 채널이 준비되어 있습니다.", "문의 이메일을 설정하세요."],
      ],
    },
    {
      key: "academic_society",
      title: "학회·연구회",
      targetTab: "activities",
      checks: [
        [hasIdentity, 20, "연구회 정체성을 설명할 기본 문구가 있습니다.", "정체성 문구를 먼저 정리하세요."],
        [publishedPages >= 4, 20, "기본 공개 페이지가 준비되어 있습니다.", "소개/활동/지원 등 공개 페이지를 게시하세요."],
        [publishedActivities >= 3, 25, "활동 기록을 연구회 구조로 전환할 수 있습니다.", "세션·연구 활동 콘텐츠를 보강하세요."],
        [publishedFaqs >= 3, 15, "문의 및 FAQ 흐름이 있습니다.", "FAQ를 보강하세요."],
        [publishedAchievements >= 1, 20, "성과 또는 산출물 기록이 있습니다.", "프로젝트·자료·성과 기록을 추가하세요."],
      ],
    },
    {
      key: "startup_team",
      title: "창업팀·프로젝트",
      targetTab: "content",
      checks: [
        [hasIdentity, 25, "팀/프로젝트 소개 문구로 전환할 수 있습니다.", "문제 정의와 팀 소개 문구가 필요합니다."],
        [hasBrandAssets, 15, "로고와 공유 이미지 구조가 준비되어 있습니다.", "브랜드 자산을 안전한 URL로 설정하세요."],
        [publishedPages >= 4, 20, "제품/팀/활동 페이지 구조를 재사용할 수 있습니다.", "핵심 공개 페이지를 게시하세요."],
        [publishedAchievements >= 2, 20, "진행 기록 또는 성과로 바꿀 수 있는 항목이 있습니다.", "진행 기록 또는 성과를 2개 이상 게시하세요."],
        [hasContact, 20, "협업 문의 채널이 준비되어 있습니다.", "문의 채널을 설정하세요."],
      ],
    },
    {
      key: "event_program",
      title: "행사·프로그램",
      targetTab: "recruitment",
      checks: [
        [Boolean(activeRecruitment), 30, "신청/접수 흐름을 행사 신청으로 전환할 수 있습니다.", "신청 기간과 접수 상태가 필요합니다."],
        [publishedPages >= 4, 20, "행사 소개 페이지 구조가 준비되어 있습니다.", "행사 안내 페이지를 게시하세요."],
        [publishedFaqs >= 3, 20, "참가 질문을 처리할 FAQ가 있습니다.", "참가 FAQ를 3개 이상 게시하세요."],
        [publishedMedia >= 2, 15, "행사 홍보 이미지로 교체할 미디어 구조가 있습니다.", "홍보 미디어를 등록하세요."],
        [hasContact, 15, "운영 문의 채널이 준비되어 있습니다.", "문의 채널을 설정하세요."],
      ],
    },
  ];

  return definitions.map((definition) => {
    const strengths: string[] = [];
    const gaps: string[] = [];
    const score = definition.checks.reduce(
      (total, [condition, points, strength, gap]) =>
        total + addScore(condition, points, strengths, gaps, strength, gap),
      0
    );

    return {
      key: definition.key,
      title: definition.title,
      score,
      status: score >= 80 ? "pass" : "warning",
      strengths,
      gaps,
      targetTab: definition.targetTab,
    };
  });
}
