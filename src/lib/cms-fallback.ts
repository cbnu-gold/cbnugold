import { activities as baseActivities } from "@/data/activities";
import { placements, awards } from "@/data/achievements";
import { history as baseHistory } from "@/data/history";
import { faqs as baseFaqs } from "@/data/faqs";
import { defaultSiteSettingsValue } from "@/lib/site-settings";
import type {
  ActivityItem,
  AchievementItem,
  ContentBlock,
  ContentPage,
  FAQItem,
  HistoryItem,
  PublicCmsData,
  RecruitmentCycle,
  SiteSettingsValue,
} from "@/types";

export const fallbackSettings: SiteSettingsValue = defaultSiteSettingsValue;

export const fallbackRecruitment: RecruitmentCycle = {
  generation: 9,
  title: "금은동 9기 신입부원 모집",
  is_open: true,
  start_at: "2026-02-19T00:00:00+09:00",
  end_at: "2026-03-01T18:00:00+09:00",
  document_result_at: "2026-03-03T18:00:00+09:00",
  interview_at: "2026-03-06T19:00:00+09:00",
  final_result_at: "2026-03-07T18:00:00+09:00",
  meeting_time: "매주 화요일 19:00 정기모임",
  requirements: [
    "충북대학교 재학생",
    "매주 화요일 19:00 정기모임 참석 가능",
    "연속 2학기 이상 활동 가능",
    "OT 참석 가능",
  ],
  fee_note: "학기 10,000원, 조건 충족 시 환급",
  docx_url: "/9기_금은동_지원서.docx",
  hwp_url: "/9기_금은동_지원서.hwp",
  requires_file: true,
  privacy_retention: "지원 결과 발표일로부터 6개월 후 파기",
  application_questions: [],
  status: "published",
};

export const fallbackBlocks: ContentBlock[] = [
  {
    page_slug: "home",
    block_key: "hero",
    title: fallbackSettings.hero_title,
    subtitle: "금융권 취업을 실전으로 준비합니다",
    body: "신문 스크랩, 리포트 분석, 세일즈 페어, 현직자 멘토링을 통해 금융권 직무 이해와 실전 역량을 함께 쌓습니다.",
    cta_label: fallbackSettings.primary_cta_label,
    cta_href: fallbackSettings.primary_cta_href,
    media_url: "/images/gold-recruiting-board.png",
    status: "published",
    sort_order: 1,
  },
  {
    page_slug: "home",
    block_key: "philosophy",
    title: "읽고, 말하고, 연결합니다",
    subtitle: "금융권 직무 준비를 활동 단위로 쌓습니다",
    body: [
      "읽고 정리합니다: 금융 뉴스와 리포트를 같은 기준으로 읽고 핵심을 남깁니다.",
      "말하고 검증합니다: 발표와 세일즈 페어에서 논리, 전달력, 질문 대응을 점검합니다.",
      "연결하고 준비합니다: 멘토링과 직무별 활동을 다음 지원 행동으로 연결합니다.",
    ].join("\n"),
    cta_label: null,
    cta_href: null,
    media_url: null,
    status: "published",
    sort_order: 2,
  },
  {
    page_slug: "home",
    block_key: "proof",
    title: "2025년 성과",
    subtitle: "취업·인턴·수상",
    body: "2025년 취업, 인턴, 수상 기록입니다.",
    cta_label: "소개 보기",
    cta_href: "/about",
    media_url: null,
    status: "published",
    sort_order: 3,
  },
  {
    page_slug: "about",
    block_key: "intro",
    title: "충북대학교 금융권 취업 동아리",
    subtitle: "금은동 소개",
    body: "금은동은 2021년 신문 스크랩 동아리로 출발하여, 현재 금융권 취업을 준비하는 충북대학교 동아리입니다. 직무잡아드림 소속으로 신문 스크랩, 리포트 분석, 멘토링, 직무별 활동을 진행합니다.",
    cta_label: null,
    cta_href: null,
    media_url: null,
    status: "published",
    sort_order: 3,
  },
  {
    page_slug: "about",
    block_key: "partners",
    title: "소속 및 협력",
    subtitle: "직무잡아드림 · 충남대 3F MOU",
    body: "공식 소속과 협력 정보는 운영진 확인 후 공개합니다.",
    cta_label: null,
    cta_href: null,
    media_url: null,
    status: "published",
    sort_order: 4,
  },
  {
    page_slug: "activity",
    block_key: "intro",
    title: "금은동의 활동",
    subtitle: "정기 활동과 특별 활동",
    body: "정기 활동과 특별 활동을 구분해 안내합니다.",
    cta_label: null,
    cta_href: null,
    media_url: null,
    status: "published",
    sort_order: 5,
  },
  {
    page_slug: "join",
    block_key: "first-semester",
    title: "합류 후 첫 학기 흐름",
    subtitle: "지원 전 확인할 활동 순서",
    body: [
      "첫 모임: 오리엔테이션에서 활동 방식과 제출 기준을 안내합니다.",
      "정기 활동: 신문 스크랩과 리포트 분석으로 금융권 이슈를 정리합니다.",
      "심화 활동: 세일즈 페어와 멘토링에서 발표와 직무 준비를 점검합니다.",
    ].join("\n"),
    cta_label: null,
    cta_href: null,
    media_url: "/images/semester-flow-board.webp",
    status: "published",
    sort_order: 6,
  },
];

export const fallbackPages: ContentPage[] = [
  {
    slug: "home",
    title: "금은동",
    description: "충북대학교 금융권 취업 동아리 금은동 공식 홈페이지입니다.",
    status: "published",
    sort_order: 1,
  },
  {
    slug: "join",
    title: "신입부원 모집",
    description: "금은동 신입부원 모집 일정, 지원 자격, 제출 서류를 안내합니다.",
    status: "published",
    sort_order: 2,
  },
  {
    slug: "about",
    title: "동아리 소개",
    description: "금은동의 운영 방향, 조직 구조, 학기별 활동을 소개합니다.",
    status: "published",
    sort_order: 3,
  },
  {
    slug: "activity",
    title: "활동 소개",
    description: "금은동의 정규 활동과 특별 활동을 소개합니다.",
    status: "published",
    sort_order: 4,
  },
];

export const fallbackActivities: ActivityItem[] = baseActivities.map(
  (activity, index) => ({
    title: activity.title,
    subtitle: activity.subtitle,
    description: activity.description,
    category: "regular",
    tags: activity.tags,
    status: "published",
    sort_order: index + 1,
  })
);

export const fallbackAchievements: AchievementItem[] = [
  ...placements.map((placement, index) => ({
    title: placement.company,
    organization: placement.type,
    result: placement.position,
    kind: "placement" as const,
    year: 2025,
    status: "published" as const,
    sort_order: index + 1,
  })),
  ...awards.map((award, index) => ({
    title: award.title,
    organization: null,
    result: award.result,
    kind: "award" as const,
    year: 2025,
    status: "published" as const,
    sort_order: index + 1,
  })),
];

export const fallbackHistory: HistoryItem[] = baseHistory.map((entry, index) => ({
  year: entry.year,
  generation: entry.generation,
  president: entry.president,
  milestones: entry.milestones,
  is_current: Boolean(entry.isCurrent),
  status: "published",
  sort_order: index + 1,
}));

export const fallbackFaqs: FAQItem[] = baseFaqs.map((faq, index) => ({
  question: faq.q,
  answer: faq.a,
  status: "published",
  sort_order: index + 1,
}));

export const fallbackCmsData: PublicCmsData = {
  settings: fallbackSettings,
  pages: fallbackPages,
  blocks: fallbackBlocks,
  recruitment: fallbackRecruitment,
  activities: fallbackActivities,
  achievements: fallbackAchievements,
  history: fallbackHistory,
  faqs: fallbackFaqs,
};
