export const organizationSiteModules = [
  {
    key: "identity",
    title: "정체성/브랜드",
    scope: "사이트 설정, 로고, 공유 이미지, 핵심 문구, 테마",
    adminSurface: "설정, 페이지 CMS, 미디어",
  },
  {
    key: "content",
    title: "공개 콘텐츠",
    scope: "소개, 활동, 성과, 이력, FAQ",
    adminSurface: "페이지 CMS, 활동, 성과, 이력, FAQ",
  },
  {
    key: "recruiting",
    title: "모집/지원",
    scope: "모집 일정, 지원 자격, 지원서 양식, 접수 확인",
    adminSurface: "모집 관리, 지원자 관리",
  },
  {
    key: "operations",
    title: "운영 통제",
    scope: "관리자 권한, 감사 로그, 헬스체크, 파일 보호",
    adminSurface: "관리자, 감사 로그, 운영 상태",
  },
] as const;

export const organizationSiteQualityGates = [
  "공개 문구는 검증 가능한 활동, 일정, 절차, 기록만 사용합니다.",
  "지원서와 개인정보는 공개 URL로 노출하지 않습니다.",
  "운영자는 대시보드에서 반복 콘텐츠와 모집 상태를 수정할 수 있어야 합니다.",
  "삭제 가능한 미디어와 사용 중인 미디어를 서버에서 구분합니다.",
  "배포 후 공개 라우트, 관리자 API, 이미지 자산, 보안 헤더를 자동 점검합니다.",
] as const;

export const organizationThemePresets = [
  {
    key: "gold",
    label: "Gold",
    description: "금은동 기본 톤입니다. 밝은 marble 배경, gold 포인트, ink 텍스트를 유지합니다.",
    colors: {
      ink: "#0E1420",
      accent: "#C9A84C",
      accentDark: "#A08735",
      marble: "#F8F6F3",
    },
  },
  {
    key: "navy",
    label: "Navy",
    description: "학회, 리서치 그룹, 전문 조직에 맞는 차분한 청색 계열입니다.",
    colors: {
      ink: "#0B1324",
      accent: "#2F6BFF",
      accentDark: "#214FBF",
      marble: "#F6F8FC",
    },
  },
  {
    key: "green",
    label: "Green",
    description: "ESG, 창업, 지역 프로젝트에 맞는 균형 잡힌 녹색 계열입니다.",
    colors: {
      ink: "#102018",
      accent: "#2F9D68",
      accentDark: "#20774E",
      marble: "#F5FAF7",
    },
  },
  {
    key: "graphite",
    label: "Graphite",
    description: "포트폴리오, 운영 조직, 기술 커뮤니티에 맞는 중립 회색 계열입니다.",
    colors: {
      ink: "#111418",
      accent: "#6E7781",
      accentDark: "#4B535C",
      marble: "#F7F7F6",
    },
  },
] as const;

export type OrganizationThemePresetKey = (typeof organizationThemePresets)[number]["key"];

export function isOrganizationThemePreset(value: string): value is OrganizationThemePresetKey {
  return organizationThemePresets.some((preset) => preset.key === value);
}

export const organizationSiteUseCases = [
  "동아리·학회 공식 홈페이지",
  "리크루팅과 지원자 관리가 필요한 팀",
  "성과·활동·FAQ를 운영진이 직접 관리하는 단체",
  "행사, 프로젝트, 창업팀 공개 소개 사이트",
] as const;

export const organizationSiteVerticals = [
  {
    key: "recruiting_club",
    title: "리크루팅형 동아리",
    primaryFlow: "정체성 확인 → 모집 일정 확인 → 지원서 제출 → 접수 확인",
    coreContent: "활동, 모집 기수, 지원 자격, FAQ, 확인된 성과",
    cta: "지원 안내 보기",
  },
  {
    key: "academic_society",
    title: "학회·연구회",
    primaryFlow: "연구 주제 확인 → 활동 자료 확인 → 세션 일정 확인 → 문의",
    coreContent: "연구 분야, 멤버, 프로젝트, 운영진, 자료실",
    cta: "세션 일정 보기",
  },
  {
    key: "startup_team",
    title: "창업팀·프로젝트",
    primaryFlow: "문제 정의 확인 → 제품/실험 확인 → 팀 소개 확인 → 협업 문의",
    coreContent: "문제, 솔루션, 진행 기록, 팀, 파트너, 문의",
    cta: "프로젝트 문의",
  },
  {
    key: "event_program",
    title: "행사·프로그램",
    primaryFlow: "행사 목적 확인 → 일정 확인 → 신청 → 안내 확인",
    coreContent: "일정, 참가 대상, 장소, 준비물, 공지, FAQ",
    cta: "참가 신청",
  },
] as const;
