import type {
  ActivityItem,
  AchievementItem,
  ContentBlock,
  ContentPage,
  ContentStatus,
  FAQItem,
  HistoryItem,
  RecruitmentCycle,
  SiteSettingsValue,
} from "@/types";

export type CmsPreviewCard = {
  key: "home" | "about" | "activity" | "join";
  label: string;
  href: string;
  status: "ready" | "review" | "missing";
  statusLabel: string;
  headline: string;
  description: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  publishedCount: number;
  draftCount: number;
  archivedCount: number;
  missingCount: number;
  warnings: string[];
  surfaces: string[];
};

type PreviewInput = {
  settings: SiteSettingsValue;
  pages: ContentPage[];
  blocks: ContentBlock[];
  recruitment: RecruitmentCycle[];
  activities: ActivityItem[];
  achievements: AchievementItem[];
  history: HistoryItem[];
  faqs: FAQItem[];
};

const pageSpecs = [
  {
    key: "home",
    label: "홈",
    href: "/",
    requiredBlocks: ["hero", "philosophy", "proof"],
    surfaces: ["첫 화면", "운영 철학", "2025 성과", "모집 CTA"],
  },
  {
    key: "about",
    label: "소개",
    href: "/about",
    requiredBlocks: ["intro", "partners"],
    surfaces: ["상단 소개", "조직 구조", "연혁", "협력 정보"],
  },
  {
    key: "activity",
    label: "활동",
    href: "/activity",
    requiredBlocks: ["intro"],
    surfaces: ["활동 소개", "정기 활동", "특별 활동"],
  },
  {
    key: "join",
    label: "지원",
    href: "/join",
    requiredBlocks: ["first-semester"],
    surfaces: ["모집 상태", "지원 일정", "지원서 양식", "FAQ"],
  },
] as const;

function countStatus(items: Array<{ status?: ContentStatus }>) {
  return items.reduce(
    (acc, item) => {
      if (item.status === "published") acc.published += 1;
      else if (item.status === "draft") acc.draft += 1;
      else if (item.status === "archived") acc.archived += 1;
      return acc;
    },
    { published: 0, draft: 0, archived: 0 }
  );
}

function findBlock(blocks: ContentBlock[], page: string, key: string) {
  return blocks.find((block) => block.page_slug === page && block.block_key === key) ?? null;
}

function firstFilled(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() ?? "";
}

function getLatestRecruitment(recruitment: RecruitmentCycle[]) {
  return [...recruitment].sort((a, b) => b.generation - a.generation)[0] ?? null;
}

function getPageHeadline(
  key: CmsPreviewCard["key"],
  settings: SiteSettingsValue,
  page: ContentPage | null,
  blocks: ContentBlock[],
  recruitment: RecruitmentCycle | null
) {
  if (key === "home") {
    const hero = findBlock(blocks, "home", "hero");
    return firstFilled(hero?.title, settings.hero_title, page?.title, settings.site_title);
  }
  if (key === "join") {
    const block = findBlock(blocks, "join", "first-semester");
    return firstFilled(recruitment?.title, page?.title, block?.title, "모집 안내");
  }
  const intro = findBlock(blocks, key, "intro");
  return firstFilled(intro?.title, page?.title, settings.site_title);
}

function getPageDescription(
  key: CmsPreviewCard["key"],
  settings: SiteSettingsValue,
  page: ContentPage | null,
  blocks: ContentBlock[],
  recruitment: RecruitmentCycle | null
) {
  if (key === "home") {
    const hero = findBlock(blocks, "home", "hero");
    return firstFilled(hero?.body, hero?.subtitle, settings.hero_subtitle, page?.description);
  }
  if (key === "join") {
    const block = findBlock(blocks, "join", "first-semester");
    return firstFilled(page?.description, block?.body, recruitment?.meeting_time, "모집 일정과 지원 흐름을 확인합니다.");
  }
  const intro = findBlock(blocks, key, "intro");
  return firstFilled(intro?.body, intro?.subtitle, page?.description, settings.brand_statement);
}

function getPageCta(
  key: CmsPreviewCard["key"],
  settings: SiteSettingsValue,
  blocks: ContentBlock[]
) {
  if (key === "home") {
    const hero = findBlock(blocks, "home", "hero");
    return {
      label: firstFilled(hero?.cta_label, settings.primary_cta_label) || null,
      href: firstFilled(hero?.cta_href, settings.primary_cta_href) || null,
    };
  }
  if (key === "join") {
    return { label: settings.primary_cta_label, href: settings.primary_cta_href };
  }
  return { label: settings.secondary_cta_label, href: settings.secondary_cta_href };
}

function buildRelatedItems(key: CmsPreviewCard["key"], input: PreviewInput) {
  if (key === "home") {
    return [
      ...input.activities.slice(0, 3),
      ...input.achievements.filter((item) => item.year === 2025),
      ...input.recruitment.slice(0, 1),
    ];
  }
  if (key === "about") return input.history;
  if (key === "activity") return input.activities;
  return [...input.recruitment.slice(0, 1), ...input.faqs];
}

export function buildCmsPreviewCards(input: PreviewInput): CmsPreviewCard[] {
  const latestRecruitment = getLatestRecruitment(input.recruitment);

  return pageSpecs.map((spec) => {
    const page = input.pages.find((item) => item.slug === spec.key) ?? null;
    const requiredBlocks = spec.requiredBlocks.map((key) => findBlock(input.blocks, spec.key, key));
    const relatedItems = buildRelatedItems(spec.key, input);
    const missingBlocks = spec.requiredBlocks.filter((_, index) => !requiredBlocks[index]);
    const statusCounts = countStatus([
      ...(page ? [page] : []),
      ...requiredBlocks.filter((item): item is ContentBlock => Boolean(item)),
      ...relatedItems,
    ]);
    const missingCount = (page ? 0 : 1) + missingBlocks.length;
    const warnings: string[] = [];

    if (!page) warnings.push(`${spec.label} 페이지 메타가 없습니다.`);
    if (page && page.status !== "published") warnings.push(`${spec.label} 페이지는 공개 상태가 아닙니다.`);
    if (missingBlocks.length) warnings.push(`필수 블록 누락: ${missingBlocks.join(", ")}`);
    if (statusCounts.draft > 0) warnings.push("초안 콘텐츠는 관리자 미리보기에만 반영되고 공개 페이지에는 노출되지 않습니다.");
    if (statusCounts.archived > 0) warnings.push("보관 콘텐츠가 연결되어 있습니다.");
    if (!relatedItems.some((item) => item.status === "published")) {
      warnings.push("연결된 반복 콘텐츠의 공개 항목을 확인해야 합니다.");
    }

    const cta = getPageCta(spec.key, input.settings, input.blocks);
    const status: CmsPreviewCard["status"] =
      missingCount > 0 ? "missing" : statusCounts.draft > 0 || statusCounts.archived > 0 ? "review" : "ready";

    return {
      key: spec.key,
      label: spec.label,
      href: spec.href,
      status,
      statusLabel: status === "ready" ? "공개 가능" : status === "review" ? "검토 필요" : "누락 확인",
      headline: getPageHeadline(spec.key, input.settings, page, input.blocks, latestRecruitment),
      description: getPageDescription(spec.key, input.settings, page, input.blocks, latestRecruitment),
      ctaLabel: cta.label,
      ctaHref: cta.href,
      publishedCount: statusCounts.published,
      draftCount: statusCounts.draft,
      archivedCount: statusCounts.archived,
      missingCount,
      warnings,
      surfaces: [...spec.surfaces],
    };
  });
}
