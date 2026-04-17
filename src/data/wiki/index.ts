import type { WikiCategoryMeta } from "@/types/wiki";

export const wikiCategories: WikiCategoryMeta[] = [
  {
    slug: "sectors",
    title: "섹터",
    titleEn: "Sectors",
    kicker: "Industry Map",
    description:
      "은행 · 증권 · 보험 · 자산운용 · 카드 · 금융공기업 · 핀테크. 금융권 전반의 구조와 비즈니스 모델을 정리합니다.",
  },
  {
    slug: "jobs",
    title: "직무",
    titleEn: "Job Families",
    kicker: "Roles & Responsibilities",
    description:
      "IB, S&T, 리서치, PB, 리스크, 심사, 운용. 금융 직무별 업무 범위와 요구 역량을 한눈에 봅니다.",
  },
  {
    slug: "certifications",
    title: "자격증",
    titleEn: "Certifications",
    kicker: "Credentials",
    description:
      "CFA · FRM · AFPK · 투자자산운용사 · 증권/파생 투자권유자문인력 등 금융권 핵심 자격증의 난이도·활용처·학습 경로.",
  },
  {
    slug: "prep",
    title: "준비 가이드",
    titleEn: "Preparation",
    kicker: "Application Playbook",
    description:
      "자소서, 필기(NCS · 경제논술), 면접, 인턴 로드맵. 금융권 채용 프로세스 전 과정을 단계별로 풀어냅니다.",
  },
  {
    slug: "games",
    title: "게임",
    titleEn: "Interactive",
    kicker: "Learn by Playing",
    description:
      "금융 역사의 결정적 순간을 시뮬레이션으로 체험합니다. 대공황부터 AI 혁명까지, 직접 투자하며 배우세요.",
  },
];

export function getCategory(slug: string): WikiCategoryMeta | undefined {
  return wikiCategories.find((c) => c.slug === slug);
}
