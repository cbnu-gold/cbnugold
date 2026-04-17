import type { Metadata } from "next";
import { WikiHero } from "@/components/wiki/WikiHero";
import { WikiCategoryCard } from "@/components/wiki/WikiCategoryCard";
import { wikiCategories } from "@/data/wiki";

export const metadata: Metadata = {
  title: "Wiki · 금융권 백과",
  description:
    "금은동이 정리하는 금융권 백과. 섹터·직무·자격증·준비 가이드와 금융사 시뮬레이션 게임까지.",
};

export default function WikiLandingPage() {
  return (
    <>
      <WikiHero
        kicker="Private Banking Research · Wiki"
        title="금융권 백과."
        titleEn="Wiki"
        description="은행·증권·보험부터 공기업·핀테크까지. 금은동이 직접 정리한 섹터·직무·자격증·준비 가이드, 그리고 금융 역사를 체험하는 인터랙티브 게임."
      />

      <section className="relative bg-white">
        <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-16 py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
            <div className="inline-flex items-center gap-3 mb-5">
              <span className="h-px w-8 bg-ink" />
              <span className="font-serif italic text-ink/70 text-xs tracking-[0.22em] uppercase">
                Categories
              </span>
              <span className="h-px w-8 bg-ink" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-light text-ink leading-tight tracking-tight mb-4">
              5개 카테고리로 구성된 금융권 지도.
            </h2>
            <p className="text-sm sm:text-base text-ink/60 leading-relaxed">
              산업 구조부터 채용 로드맵까지. 각 카테고리는 현직자 자문과 신입 합격자 후기를 바탕으로 단계적으로 채워집니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 max-w-[1200px] mx-auto">
            {wikiCategories.map((cat, i) => (
              <WikiCategoryCard key={cat.slug} category={cat} index={i} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
