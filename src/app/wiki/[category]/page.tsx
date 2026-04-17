import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { WikiHero } from "@/components/wiki/WikiHero";
import { getCategory, wikiCategories } from "@/data/wiki";

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  return wikiCategories
    .filter((c) => c.slug !== "games")
    .map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const meta = getCategory(category);
  if (!meta) return { title: "Wiki" };
  return {
    title: `${meta.title} · Wiki`,
    description: meta.description,
  };
}

const comingSections: Record<string, { title: string; items: string[] }[]> = {
  sectors: [
    {
      title: "Commercial & Retail Banking",
      items: ["시중은행 5대 구조", "지방은행·특수은행", "디지털 은행·인터넷전문은행"],
    },
    {
      title: "Investment Banking & Securities",
      items: ["국내 IB 라인업", "Global Bulge Bracket", "PIB / Prime Brokerage"],
    },
    {
      title: "Asset & Wealth Management",
      items: ["자산운용사 맵", "PB / WM 비즈니스 모델", "ETF · 패시브 산업"],
    },
    {
      title: "Insurance · Card · Fintech",
      items: ["생보 · 손보 구조", "카드사 수익모델", "핀테크 · 디지털 자산"],
    },
    {
      title: "Public Financial Institutions",
      items: ["한국은행 · 금감원 · 예보", "정책금융기관(KDB · IBK · 신복)", "거래소 · 예탁결제원"],
    },
  ],
  jobs: [
    {
      title: "Front Office",
      items: ["IB (M&A · ECM · DCM)", "Sales & Trading", "Research (Equity · Credit · Macro)"],
    },
    {
      title: "Wealth / Asset",
      items: ["PB / WM Advisor", "Portfolio Manager", "Fund Manager"],
    },
    {
      title: "Risk & Middle Office",
      items: ["Credit · Market Risk", "Compliance · AML", "Operations · Quant Dev"],
    },
    {
      title: "Retail & Corporate Banking",
      items: ["창구 RM", "기업금융 RM", "외환 · 글로벌 뱅킹"],
    },
  ],
  certifications: [
    {
      title: "국제 자격",
      items: ["CFA (Level 1~3)", "FRM (Part 1~2)", "CAIA · CIIA"],
    },
    {
      title: "국내 핵심",
      items: ["투자자산운용사", "증권/파생 투자권유자문인력", "금융투자분석사"],
    },
    {
      title: "WM / 기획",
      items: ["AFPK · CFP", "은행FP · 재무설계사", "보험계리사 (손보 · 생보)"],
    },
    {
      title: "기초 · 언어",
      items: ["NCS 금융권 공통", "TOEIC · OPIc", "TESAT · 매경테스트"],
    },
  ],
  prep: [
    {
      title: "자기소개서",
      items: ["동기 · 직무 · 역량 3축", "섹터별 자소서 톤", "첨삭 체크리스트"],
    },
    {
      title: "필기 전형",
      items: ["NCS 직업기초 · 직무", "경제 · 시사 논술", "금융상식 퀴즈"],
    },
    {
      title: "면접",
      items: ["AI 역량검사", "1차 실무 · PT", "임원 인성 · Case"],
    },
    {
      title: "인턴 · 커리어 로드맵",
      items: ["공채 · 수시 트랙", "방학 인턴 시즌 맵", "경력직 전환 체크"],
    },
  ],
};

export default async function WikiCategoryPage({ params }: PageProps) {
  const { category } = await params;
  const meta = getCategory(category);

  if (!meta) {
    notFound();
  }

  if (meta.slug === "games") {
    redirect("/wiki/games");
  }

  const sections = comingSections[meta.slug] ?? [];
  const categoryIndex = wikiCategories.findIndex((c) => c.slug === meta.slug);

  return (
    <>
      <WikiHero
        breadcrumb={[
          { label: "Wiki", href: "/wiki" },
          { label: meta.titleEn },
        ]}
        kicker={meta.kicker}
        title={`${meta.title}.`}
        titleEn={meta.titleEn}
        description={meta.description}
      />

      {/* Coming soon preview */}
      <section className="relative bg-white">
        <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-16 py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
            <div className="inline-flex items-center gap-3 mb-5">
              <span className="h-px w-8 bg-ink" />
              <span className="font-serif italic text-ink/70 text-xs tracking-[0.22em] uppercase">
                Coming Soon
              </span>
              <span className="h-px w-8 bg-ink" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-light text-ink leading-tight tracking-tight mb-4">
              아래 항목들이 순차적으로 공개됩니다.
            </h2>
            <p className="text-sm sm:text-base text-ink/60 leading-relaxed">
              현직자 검수 · 합격자 후기를 바탕으로 집필 중. PB 리서치 리포트 형식으로 정리됩니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[1100px] mx-auto">
            {sections.map((section, i) => (
              <div
                key={section.title}
                className="bg-white border border-ink/12 p-6 sm:p-7"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono tabular-nums text-[11px] text-ink/50 tracking-[0.2em] uppercase">
                    0{i + 1}
                  </span>
                  <span className="font-serif italic text-ink/60 text-[11px] tracking-[0.22em] uppercase">
                    Section
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-medium text-ink leading-snug mb-4">
                  {section.title}
                </h3>
                <div className="h-px w-10 bg-ink/20 mb-4" />
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-ink/70 leading-relaxed"
                    >
                      <span className="font-mono tabular-nums text-ink/30 text-[11px] mt-[0.35rem]">—</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Nav to other categories */}
          <div className="mt-16 md:mt-20 pt-10 border-t border-ink/10">
            <div className="max-w-3xl mx-auto text-center mb-8">
              <span className="font-serif italic text-ink/70 text-xs tracking-[0.22em] uppercase">
                — Other Categories
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
              {wikiCategories
                .filter((c, idx) => idx !== categoryIndex)
                .map((c) => (
                  <Link
                    key={c.slug}
                    href={c.slug === "games" ? "/wiki/games" : `/wiki/${c.slug}`}
                    className="px-4 py-2 border border-ink/15 text-xs uppercase tracking-[0.18em] text-ink/70 hover:border-ink hover:text-ink hover:bg-ink/[0.04] transition-all duration-300"
                  >
                    {c.title} <span className="font-serif italic text-ink/50 ml-1 normal-case tracking-normal">{c.titleEn}</span>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
