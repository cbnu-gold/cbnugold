export interface WikiGameMeta {
  slug: string;
  title: string;
  titleEn: string;
  kicker: string;
  summary: string;
  duration: string;
  credit: string;
}

export const wikiGames: WikiGameMeta[] = [
  {
    slug: "market-survivor",
    title: "마켓 서바이버",
    titleEn: "Market Survivor",
    kicker: "Historical Simulation · 1929—2024",
    summary:
      "대공황부터 AI 랠리까지, 금융사 결정적 순간 10가지를 직접 투자해 살아남으세요. 당신의 최종 수익률은?",
    duration: "약 5분",
    credit: "Originally developed by 8기 이찬희",
  },
];

export function getGame(slug: string): WikiGameMeta | undefined {
  return wikiGames.find((g) => g.slug === slug);
}
