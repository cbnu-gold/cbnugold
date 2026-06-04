export const organizationSiteModules = [
  {
    key: "identity",
    title: "정체성/브랜드",
    scope: "사이트 설정, 로고, 공유 이미지, 핵심 문구",
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
    title: "모집/신청",
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
  "공개 문구는 확인 가능한 활동, 일정, 절차, 기록만 사용합니다.",
  "지원서와 개인정보는 공개 URL로 노출하지 않습니다.",
  "운영자가 웹 대시보드에서 반복 콘텐츠와 모집 상태를 수정할 수 있어야 합니다.",
  "삭제 가능한 미디어와 사용 중인 미디어를 서버에서 구분합니다.",
  "배포 전 공개 라우트, 관리자 API, 이미지 자산, 보안 헤더를 자동 점검합니다.",
] as const;
