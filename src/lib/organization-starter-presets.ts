import type {
  ActivityItem,
  AchievementItem,
  ContentBlock,
  ContentPage,
  FAQItem,
  HistoryItem,
  RecruitmentCycle,
  SiteSettingsValue,
} from "@/types";
import { organizationSiteVerticals, organizationThemePresets } from "@/lib/organization-site-model";

export type OrganizationStarterPresetKey = (typeof organizationSiteVerticals)[number]["key"];

export type OrganizationStarterDraft = {
  key: OrganizationStarterPresetKey;
  settings: SiteSettingsValue;
  pages: ContentPage[];
  blocks: ContentBlock[];
  recruitment: RecruitmentCycle[];
  activities: ActivityItem[];
  achievements: AchievementItem[];
  history: HistoryItem[];
  faqs: FAQItem[];
};

type StarterSpec = {
  organizationType: string;
  brandStatement: string;
  theme: SiteSettingsValue["brand_preset"];
  heroTitle: string;
  heroSubtitle: string;
  primaryCta: string;
  activityTitles: string[];
  faqQuestions: string[];
  requiresFile: boolean;
};

const starterSpecs: Record<OrganizationStarterPresetKey, StarterSpec> = {
  recruiting_club: {
    organizationType: "리크루팅형 동아리",
    brandStatement: "활동, 지원, 성장을 연결합니다",
    theme: "gold",
    heroTitle: "단체명 신입 구성원 모집",
    heroSubtitle: "활동 내용, 모집 일정, 지원 절차를 한 화면에서 안내합니다.",
    primaryCta: "지원 안내 보기",
    activityTitles: ["정기 활동", "실전 준비", "멘토링"],
    faqQuestions: ["지원 대상은 어떻게 되나요?", "정기 활동은 언제 진행되나요?", "선발 절차는 어떻게 진행되나요?"],
    requiresFile: true,
  },
  academic_society: {
    organizationType: "학회·연구회",
    brandStatement: "주제를 정리하고 결과를 공유합니다",
    theme: "navy",
    heroTitle: "단체명 연구회",
    heroSubtitle: "연구 주제, 세션 일정, 프로젝트 기록을 운영진이 직접 관리합니다.",
    primaryCta: "세션 일정 보기",
    activityTitles: ["정기 세션", "프로젝트 리뷰", "자료 공유"],
    faqQuestions: ["참여 대상은 어떻게 되나요?", "세션은 어떤 방식으로 진행되나요?", "자료는 어디에서 확인하나요?"],
    requiresFile: false,
  },
  startup_team: {
    organizationType: "창업팀·프로젝트",
    brandStatement: "문제, 실험, 협업을 공개합니다",
    theme: "green",
    heroTitle: "단체명 프로젝트",
    heroSubtitle: "문제 정의, 진행 기록, 협업 문의 흐름을 공개합니다.",
    primaryCta: "프로젝트 문의",
    activityTitles: ["문제 검증", "제품 실험", "파트너 미팅"],
    faqQuestions: ["현재 어떤 문제를 다루나요?", "협업 문의는 어떻게 하나요?", "진행 기록은 어디에서 보나요?"],
    requiresFile: false,
  },
  event_program: {
    organizationType: "행사·프로그램",
    brandStatement: "일정, 신청, 안내를 단순하게 운영합니다",
    theme: "graphite",
    heroTitle: "프로그램명 참가 신청",
    heroSubtitle: "행사 목적, 일정, 참가 대상, 준비물을 명확히 안내합니다.",
    primaryCta: "참가 신청",
    activityTitles: ["프로그램 안내", "참가자 공지", "현장 운영"],
    faqQuestions: ["참가 대상은 누구인가요?", "준비물은 무엇인가요?", "신청 후 안내는 어떻게 받나요?"],
    requiresFile: false,
  },
};

function draftPage(slug: string, title: string, description: string, sortOrder: number): ContentPage {
  return { slug, title, description, status: "draft", sort_order: sortOrder };
}

function draftBlock(
  pageSlug: string,
  blockKey: string,
  title: string,
  subtitle: string,
  body: string,
  sortOrder: number,
  ctaLabel: string | null = null,
  ctaHref: string | null = null
): ContentBlock {
  return {
    page_slug: pageSlug,
    block_key: blockKey,
    title,
    subtitle,
    body,
    cta_label: ctaLabel,
    cta_href: ctaHref,
    media_url: null,
    status: "draft",
    sort_order: sortOrder,
  };
}

export function getOrganizationStarterPreset(key: OrganizationStarterPresetKey) {
  return {
    ...organizationSiteVerticals.find((vertical) => vertical.key === key),
    ...starterSpecs[key],
  };
}

export function buildOrganizationStarterDraft(
  key: OrganizationStarterPresetKey,
  currentSettings: SiteSettingsValue
): OrganizationStarterDraft {
  const spec = starterSpecs[key];
  const vertical = organizationSiteVerticals.find((item) => item.key === key) ?? organizationSiteVerticals[0];
  const theme = organizationThemePresets.some((preset) => preset.key === spec.theme) ? spec.theme : "gold";

  return {
    key,
    settings: {
      ...currentSettings,
      organization_type: spec.organizationType,
      brand_statement: spec.brandStatement,
      brand_preset: theme,
      hero_title: spec.heroTitle,
      hero_subtitle: spec.heroSubtitle,
      primary_cta_label: spec.primaryCta,
      primary_cta_href: "/join",
      secondary_cta_label: "활동 살펴보기",
      secondary_cta_href: "/activity",
    },
    pages: [
      draftPage("home", "홈", `${spec.organizationType} 첫 화면 초안`, 1),
      draftPage("join", spec.primaryCta, `${vertical.title} 신청과 안내 초안`, 2),
      draftPage("about", "소개", "단체 소개와 운영 구조 초안", 3),
      draftPage("activity", "활동", "활동, 세션, 프로젝트 기록 초안", 4),
    ],
    blocks: [
      draftBlock("home", "hero", spec.heroTitle, spec.brandStatement, spec.heroSubtitle, 1, spec.primaryCta, "/join"),
      draftBlock(
        "home",
        "philosophy",
        "운영 방향",
        "공개 전 운영진 확인 필요",
        [
          "정체성: 단체가 다루는 주제와 대상을 입력합니다.",
          "활동: 반복 활동과 일정 기준을 입력합니다.",
          "신청: 신청 절차와 문의 채널을 입력합니다.",
        ].join("\n"),
        2
      ),
      draftBlock("home", "proof", "운영 기록", "확인된 기록만 게시", "성과가 없으면 활동 기록이나 일정 기록으로 대체합니다.", 3),
      draftBlock("about", "intro", `${spec.organizationType} 소개`, "공식 소개 문구", "단체의 목적, 운영진, 활동 범위를 확인된 정보로 입력합니다.", 4),
      draftBlock("activity", "intro", "활동 안내", vertical.coreContent, "정기 활동, 특별 활동, 자료 공개 기준을 입력합니다.", 5),
      draftBlock("join", "first-semester", "참여 후 흐름", "신청 전 확인할 순서", vertical.primaryFlow, 6),
    ],
    recruitment: [
      {
        generation: 1,
        title: `${spec.organizationType} 신청 초안`,
        is_open: false,
        start_at: null,
        end_at: null,
        document_result_at: null,
        interview_at: null,
        final_result_at: null,
        meeting_time: null,
        requirements: ["운영진 확인 후 참가 대상을 입력합니다."],
        fee_note: null,
        docx_url: null,
        hwp_url: null,
        requires_file: spec.requiresFile,
        privacy_retention: "신청 결과 안내 후 6개월 이내 파기",
        application_questions: [
          {
            id: "motivation",
            label: key === "event_program" ? "참가 목적" : "지원 또는 참여 목적",
            type: "long_text",
            required: true,
            options: [],
            placeholder: "운영진이 확인할 내용을 작성해주세요.",
          },
        ],
        status: "draft",
      },
    ],
    activities: spec.activityTitles.map((title, index) => ({
      title,
      subtitle: "운영진 확인 후 공개",
      description: "구체적인 활동 내용, 일정, 대상은 운영진 확인 후 입력합니다.",
      category: "regular",
      tags: [spec.organizationType],
      status: "draft",
      sort_order: index + 1,
    })),
    achievements: [],
    history: [],
    faqs: spec.faqQuestions.map((question, index) => ({
      question,
      answer: "운영진 확인 후 공개합니다.",
      status: "draft",
      sort_order: index + 1,
    })),
  };
}
