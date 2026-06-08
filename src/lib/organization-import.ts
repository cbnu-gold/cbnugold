import {
  inspectOrganizationSiteExportBundle,
  validateOrganizationSiteExportBundle,
} from "@/lib/organization-export";
import { validateAndNormalizeApplicationQuestions } from "@/lib/application-questions";
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

type DraftImportResources = {
  settings: SiteSettingsValue;
  pages: ContentPage[];
  blocks: ContentBlock[];
  recruitment: RecruitmentCycle[];
  activities: ActivityItem[];
  achievements: AchievementItem[];
  history: HistoryItem[];
  faqs: FAQItem[];
  mediaReferences: Array<Pick<MediaAsset, "bucket" | "path" | "public_url" | "alt" | "kind">>;
};

export type OrganizationSiteDraftImport = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  data: DraftImportResources | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function records(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function nullableString(value: unknown) {
  const next = stringValue(value);
  return next || null;
}

function numberValue(value: unknown, fallback: number) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

function getResources(value: unknown) {
  if (!isRecord(value) || !isRecord(value.resources)) return null;
  return value.resources;
}

export function buildOrganizationSiteDraftImport(value: unknown): OrganizationSiteDraftImport {
  const validation = validateOrganizationSiteExportBundle(value);
  const inspection = inspectOrganizationSiteExportBundle(value);
  const warnings = [...inspection.warnings];

  if (!validation.ok) {
    return { ok: false, errors: validation.errors, warnings, data: null };
  }

  const resources = getResources(value);
  if (!resources) {
    return { ok: false, errors: ["운영 패키지 resources를 찾을 수 없습니다."], warnings, data: null };
  }

  const settingsResult = validateAndNormalizeSiteSettingsValue(resources.settings);
  if (settingsResult.error || !settingsResult.value) {
    return {
      ok: false,
      errors: [`settings: ${settingsResult.error ?? "사이트 설정을 읽을 수 없습니다."}`],
      warnings,
      data: null,
    };
  }

  const mediaReferences = records(resources.media).map((item) => ({
    bucket: stringValue(item.bucket, "cms-media"),
    path: stringValue(item.path),
    public_url: nullableString(item.public_url),
    alt: nullableString(item.alt),
    kind: stringValue(item.kind, "image"),
  }));

  if (mediaReferences.length > 0) {
    warnings.push("미디어 파일은 스토리지 파일과 분리되어 초안으로 자동 생성하지 않습니다. 필요한 파일은 미디어 탭에서 다시 업로드하세요.");
  }

  return {
    ok: true,
    errors: [],
    warnings,
    data: {
      settings: settingsResult.value,
      pages: records(resources.pages).map((item, index) => ({
        slug: stringValue(item.slug, `page-${index + 1}`),
        title: stringValue(item.title),
        description: nullableString(item.description),
        status: "draft",
        sort_order: numberValue(item.sort_order, index + 1),
      })),
      blocks: records(resources.blocks).map((item, index) => ({
        page_slug: stringValue(item.page_slug, "home"),
        block_key: stringValue(item.block_key, `block-${index + 1}`),
        title: nullableString(item.title),
        subtitle: nullableString(item.subtitle),
        body: nullableString(item.body),
        cta_label: nullableString(item.cta_label),
        cta_href: nullableString(item.cta_href),
        media_url: nullableString(item.media_url),
        data: isRecord(item.data) ? item.data : undefined,
        status: "draft",
        sort_order: numberValue(item.sort_order, index + 1),
      })),
      recruitment: records(resources.recruitment).map((item, index) => ({
        generation: numberValue(item.generation, index + 1),
        title: stringValue(item.title, "모집 초안"),
        is_open: false,
        start_at: nullableString(item.start_at),
        end_at: nullableString(item.end_at),
        document_result_at: nullableString(item.document_result_at),
        interview_at: nullableString(item.interview_at),
        final_result_at: nullableString(item.final_result_at),
        meeting_time: nullableString(item.meeting_time),
        requirements: stringArray(item.requirements),
        fee_note: nullableString(item.fee_note),
        docx_url: nullableString(item.docx_url),
        hwp_url: nullableString(item.hwp_url),
        privacy_retention: stringValue(item.privacy_retention, "지원 결과 발표 후 6개월 이내 폐기"),
        application_questions: validateAndNormalizeApplicationQuestions(item.application_questions).value ?? [],
        status: "draft",
      })),
      activities: records(resources.activities).map((item, index) => ({
        title: stringValue(item.title),
        subtitle: nullableString(item.subtitle),
        description: stringValue(item.description),
        category: stringValue(item.category, "regular"),
        tags: stringArray(item.tags),
        status: "draft",
        sort_order: numberValue(item.sort_order, index + 1),
      })),
      achievements: records(resources.achievements).map((item, index) => ({
        title: stringValue(item.title),
        organization: nullableString(item.organization),
        result: stringValue(item.result),
        kind:
          item.kind === "award" || item.kind === "metric" || item.kind === "placement"
            ? item.kind
            : "metric",
        year: Number.isInteger(item.year) ? Number(item.year) : null,
        status: "draft",
        sort_order: numberValue(item.sort_order, index + 1),
      })),
      history: records(resources.history).map((item, index) => ({
        year: numberValue(item.year, new Date().getFullYear()),
        generation: Number.isInteger(item.generation) ? Number(item.generation) : null,
        president: nullableString(item.president),
        milestones: stringArray(item.milestones),
        is_current: Boolean(item.is_current),
        status: "draft",
        sort_order: numberValue(item.sort_order, index + 1),
      })),
      faqs: records(resources.faqs).map((item, index) => ({
        question: stringValue(item.question),
        answer: stringValue(item.answer),
        status: "draft",
        sort_order: numberValue(item.sort_order, index + 1),
      })),
      mediaReferences,
    },
  };
}
