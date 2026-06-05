import type {
  ActivityItem,
  AchievementItem,
  ContentBlock,
  ContentPage,
  FAQItem,
  HistoryItem,
  MediaAsset,
  RecruitmentCycle,
  SiteSettingsValue,
} from "@/types";

export const organizationSiteExportResourceKeys = [
  "settings",
  "pages",
  "blocks",
  "recruitment",
  "activities",
  "achievements",
  "history",
  "faqs",
  "media",
] as const;

export type OrganizationSiteExportInput = {
  settings: SiteSettingsValue;
  pages: ContentPage[];
  blocks: ContentBlock[];
  recruitment: RecruitmentCycle[];
  activities: ActivityItem[];
  achievements: AchievementItem[];
  history: HistoryItem[];
  faqs: FAQItem[];
  media: MediaAsset[];
};

function omitRuntimeFields<T extends Record<string, unknown>>(item: T) {
  const { id, created_at, updated_at, updated_by, signed_url, ...safe } = item;
  void id;
  void created_at;
  void updated_at;
  void updated_by;
  void signed_url;
  return safe;
}

export function buildOrganizationSiteExport(
  input: OrganizationSiteExportInput,
  exportedAt = new Date().toISOString()
) {
  return {
    version: 1,
    exported_at: exportedAt,
    note: "CMS 운영 데이터만 포함합니다. 지원자, 관리자 계정, 감사 로그, 비공개 지원서 파일은 제외됩니다.",
    resources: {
      settings: input.settings,
      pages: input.pages.map((item) => omitRuntimeFields(item as unknown as Record<string, unknown>)),
      blocks: input.blocks.map((item) => omitRuntimeFields(item as unknown as Record<string, unknown>)),
      recruitment: input.recruitment.map((item) => omitRuntimeFields(item as unknown as Record<string, unknown>)),
      activities: input.activities.map((item) => omitRuntimeFields(item as unknown as Record<string, unknown>)),
      achievements: input.achievements.map((item) => omitRuntimeFields(item as unknown as Record<string, unknown>)),
      history: input.history.map((item) => omitRuntimeFields(item as unknown as Record<string, unknown>)),
      faqs: input.faqs.map((item) => omitRuntimeFields(item as unknown as Record<string, unknown>)),
      media: input.media.map((item) =>
        omitRuntimeFields({
          bucket: item.bucket,
          path: item.path,
          public_url: item.public_url,
          alt: item.alt,
          kind: item.kind,
          status: item.status,
        })
      ),
    },
  };
}
