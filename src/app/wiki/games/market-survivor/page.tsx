import type { Metadata } from "next";
import Link from "next/link";
import { MarketSurvivor } from "@/components/wiki/MarketSurvivor";
import { getGame } from "@/data/wiki/games";

const game = getGame("market-survivor")!;

export const metadata: Metadata = {
  title: `${game.title} · 금융사 시뮬레이션`,
  description: game.summary,
};

export default function MarketSurvivorPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-marble" />
        <div className="absolute inset-0 marble-texture" />
        <div className="absolute inset-0 gold-grid opacity-40" />

        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-16 pt-28 pb-10 md:pt-36 md:pb-14">
          <div className="max-w-2xl mx-auto text-center">
            <nav className="flex items-center justify-center gap-2 font-mono tabular-nums text-[11px] text-ink/50 tracking-wider uppercase mb-6">
              <Link href="/wiki" className="hover:text-ink transition-colors">Wiki</Link>
              <span className="text-ink/30">/</span>
              <Link href="/wiki/games" className="hover:text-ink transition-colors">Games</Link>
              <span className="text-ink/30">/</span>
              <span className="text-ink/70">{game.titleEn}</span>
            </nav>

            <p className="font-serif italic text-ink/70 text-sm tracking-[0.22em] uppercase mb-5">
              {game.kicker}
            </p>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-ink leading-[1.05] tracking-[-0.02em] mb-3">
              {game.title}
            </h1>
            <p className="font-serif italic text-ink/60 text-xl sm:text-2xl tracking-wide mb-6">
              {game.titleEn}
            </p>

            <div className="h-px w-16 bg-ink mx-auto my-6" />

            <p className="text-base md:text-lg text-ink/70 leading-relaxed max-w-xl mx-auto">
              {game.summary}
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-ink/10" />
      </section>

      {/* Game */}
      <section className="relative bg-white">
        <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-16 py-16 md:py-24">
          <MarketSurvivor />
        </div>
      </section>

      {/* About / Credit */}
      <section className="relative bg-marble-light border-t border-ink/10">
        <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-16 py-16 md:py-20">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 mb-5">
              <span className="h-px w-8 bg-ink" />
              <span className="font-serif italic text-ink/70 text-xs tracking-[0.22em] uppercase">
                About this simulation
              </span>
              <span className="h-px w-8 bg-ink" />
            </div>
            <h2 className="text-xl sm:text-2xl font-light text-ink leading-snug tracking-tight mb-4">
              역사 속 투자자의 시선으로, 직접 결정합니다.
            </h2>
            <p className="text-sm sm:text-[15px] text-ink/70 leading-relaxed mb-6">
              1929년 대공황부터 2024년 AI 랠리·트럼프 재선까지. 매 라운드 3개의 선택지 가운데 하나를 고르고, 그 결과로 포트폴리오가 변동합니다. 시장의 비이성, 역사의 변곡점을 체감하세요.
            </p>
            <p className="font-mono tabular-nums text-[11px] text-ink/50 tracking-[0.2em] uppercase">
              {game.credit}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
