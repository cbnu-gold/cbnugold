import type { Metadata } from "next";
import Link from "next/link";
import { WikiHero } from "@/components/wiki/WikiHero";
import { wikiGames } from "@/data/wiki/games";

export const metadata: Metadata = {
  title: "Games · 금융 시뮬레이션",
  description:
    "금융사의 결정적 순간을 직접 투자하며 배우는 인터랙티브 시뮬레이션 모음.",
};

export default function GamesPage() {
  return (
    <>
      <WikiHero
        breadcrumb={[
          { label: "Wiki", href: "/wiki" },
          { label: "Games" },
        ]}
        kicker="Learn by Playing"
        title="시뮬레이션으로 배우는 금융."
        titleEn="Interactive"
        description="대공황부터 AI 랠리까지, 금융사의 결정적 순간을 직접 투자하며 체험하세요. 이론만으로는 잡히지 않는 시장 감각을 키웁니다."
      />

      <section className="relative bg-white">
        <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-16 py-20 md:py-28">
          <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            {wikiGames.map((game, i) => (
              <Link
                key={game.slug}
                href={`/wiki/games/${game.slug}`}
                className="group relative block bg-white border border-ink/12 p-7 sm:p-8 transition-all duration-500 hover:border-ink/30 hover:bg-marble-light"
              >
                <span className="absolute top-0 left-0 h-px bg-ink w-0 group-hover:w-full transition-[width] duration-700 ease-out" />

                <div className="flex items-center justify-between mb-5">
                  <span className="font-mono tabular-nums text-[11px] text-ink/50 tracking-[0.2em] uppercase">
                    0{i + 1}
                  </span>
                  <span className="font-serif italic text-ink/60 text-[11px] tracking-[0.22em] uppercase">
                    {game.kicker}
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-light text-ink leading-tight tracking-tight mb-2">
                  {game.title}
                </h3>
                <p className="font-serif italic text-ink/60 text-base sm:text-lg tracking-wide mb-5">
                  {game.titleEn}
                </p>

                <div className="h-px w-12 bg-ink/20 group-hover:bg-ink group-hover:w-24 transition-all duration-500 mb-5" />

                <p className="text-sm sm:text-[15px] text-ink/70 leading-relaxed mb-6">
                  {game.summary}
                </p>

                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-ink/50 font-mono tabular-nums">
                  <span>{game.duration}</span>
                  <span className="flex items-center gap-2 group-hover:text-ink transition-colors">
                    Play
                    <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
