import { validateAndNormalizeSiteSettingsValue } from "@/lib/site-settings";
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

type OrganizationSiteExportResourceKey = (typeof organizationSiteExportResourceKeys)[number];

export type OrganizationSiteExportBundle = ReturnType<typeof buildOrganizationSiteExport>;

export type OrganizationSiteExportInspection = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  counts: Record<OrganizationSiteExportResourceKey, number>;
};

const sensitiveExportKeys = new Set([
  "applicants",
  "admin_profiles",
  "audit_logs",
  "applications",
  "signed_url",
  "file_url",
  "student_id",
  "phone",
  "admin_note",
  "review_score",
]);

const runtimeExportFields = new Set(["id", "created_at", "updated_at", "updated_by", "signed_url"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

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
    note: "CMS 운영 데이터만 포함합니다. 지원자, 관리자 계정, 감사 로그, 비공개 지원서 파일은 제외합니다.",
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

export function validateOrganizationSiteExportBundle(value: unknown): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { ok: false, errors: ["운영 패키지는 객체 형식이어야 합니다."] };
  }

  if (value.version !== 1) {
    errors.push("지원하는 운영 패키지 버전은 1입니다.");
  }

  if (!isRecord(value.resources)) {
    errors.push("resources 객체가 필요합니다.");
    return { ok: false, errors };
  }

  const resourceKeys = new Set(organizationSiteExportResourceKeys);
  for (const key of Object.keys(value.resources)) {
    if (!resourceKeys.has(key as (typeof organizationSiteExportResourceKeys)[number])) {
      errors.push(`지원하지 않는 리소스입니다: ${key}`);
    }
    if (sensitiveExportKeys.has(key)) {
      errors.push(`민감 리소스는 운영 패키지에 포함할 수 없습니다: ${key}`);
    }
  }

  for (const key of organizationSiteExportResourceKeys) {
    const resource = value.resources[key];
    if (key === "settings") {
      const settingsResult = validateAndNormalizeSiteSettingsValue(resource);
      if (settingsResult.error) errors.push(`settings: ${settingsResult.error}`);
      continue;
    }
    if (!Array.isArray(resource)) {
      errors.push(`${key} 리소스는 배열이어야 합니다.`);
      continue;
    }
    for (const [index, item] of resource.entries()) {
      if (!isRecord(item)) {
        errors.push(`${key}[${index}] 항목은 객체여야 합니다.`);
      }
    }
  }

  for (const [resourceName, resource] of Object.entries(value.resources)) {
    if (!Array.isArray(resource)) continue;
    for (const [index, item] of resource.entries()) {
      if (!isRecord(item)) continue;
      for (const field of Object.keys(item)) {
        if (runtimeExportFields.has(field)) {
          errors.push(`${resourceName}[${index}]에 런타임 필드가 포함되어 있습니다: ${field}`);
        }
        if (sensitiveExportKeys.has(field)) {
          errors.push(`${resourceName}[${index}]에 민감 필드가 포함되어 있습니다: ${field}`);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export function inspectOrganizationSiteExportBundle(value: unknown): OrganizationSiteExportInspection {
  const validation = validateOrganizationSiteExportBundle(value);
  const counts = Object.fromEntries(organizationSiteExportResourceKeys.map((key) => [key, 0])) as Record<
    OrganizationSiteExportResourceKey,
    number
  >;
  const warnings: string[] = [];

  if (!isRecord(value) || !isRecord(value.resources)) {
    return { ...validation, warnings, counts };
  }

  for (const key of organizationSiteExportResourceKeys) {
    const resource = value.resources[key];
    counts[key] = key === "settings" ? (isRecord(resource) ? 1 : 0) : Array.isArray(resource) ? resource.length : 0;
  }

  const pages = Array.isArray(value.resources.pages) ? value.resources.pages.filter(isRecord) : [];
  const blocks = Array.isArray(value.resources.blocks) ? value.resources.blocks.filter(isRecord) : [];

  if (counts.pages < 4) warnings.push("공개 페이지가 4개 미만입니다. 홈, 소개, 활동, 지원 페이지 구성을 확인해야 합니다.");
  if (counts.recruitment < 1) warnings.push("모집 기수가 없습니다. 지원 또는 신청 흐름이 필요한 단체라면 모집 설정을 추가해야 합니다.");
  if (counts.faqs < 3) warnings.push("FAQ가 3개 미만입니다. 지원자 또는 방문자가 반복 확인하는 질문을 보강해야 합니다.");
  if (counts.media < 1) warnings.push("미디어가 없습니다. 공식 로고, 공유 이미지, 홍보 이미지를 교체할 계획을 확인해야 합니다.");

  const pageSlugs = new Set(pages.map((item) => item.slug).filter((value): value is string => typeof value === "string"));
  for (const slug of ["home", "about", "activity", "join"]) {
    if (!pageSlugs.has(slug)) warnings.push(`공개 페이지 slug가 누락되었습니다: ${slug}`);
  }

  const blockKeys = new Set(
    blocks
      .map((item) =>
        typeof item.page_slug === "string" && typeof item.block_key === "string"
          ? `${item.page_slug}/${item.block_key}`
          : null
      )
      .filter((value): value is string => Boolean(value))
  );
  for (const key of ["home/hero", "home/proof", "join/first-semester"]) {
    if (!blockKeys.has(key)) warnings.push(`핵심 블록이 누락되었습니다: ${key}`);
  }

  return { ...validation, warnings, counts };
}
