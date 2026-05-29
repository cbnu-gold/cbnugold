import type { Metadata } from "next";
import Link from "next/link";
import { getPublicCmsData } from "@/lib/cms-public";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Wiki · 금융권 백과",
  description: "금은동이 정리하는 금융권 섹터, 직무, 자격증, 준비 가이드.",
};

export default async function WikiLandingPage() {
  const data = await getPublicCmsData();
  const grouped = data.wikiArticles.reduce<Record<string, typeof data.wikiArticles>>((acc, item) => {
    acc[item.category] = [...(acc[item.category] ?? []), item];
    return acc;
  }, {});

  return (
    <div className="bg-marble-light pt-24 text-ink">
      <section className="border-b border-ink/10 bg-white py-16 md:py-24">
        <div className="mx-auto max-w-[1000px] px-6 text-center">
          <h1 className="text-4xl font-bold tracking-normal sm:text-5xl">금융권 백과</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">
            은행·증권·보험·공기업·핀테크까지, 금은동 운영진이 관리하는 금융권 커리어 지식베이스입니다.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-14 md:py-20">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(grouped).map(([category, articles]) => (
            <Link
              key={category}
              href={`/wiki/${category}`}
              className="rounded-xl border border-ink/10 bg-white p-6 transition hover:border-gold/40"
            >
              <p className="text-sm font-semibold text-gold-dark">{category}</p>
              <h2 className="mt-3 text-2xl font-bold">{articles[0]?.title ?? category}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">{articles[0]?.summary}</p>
              <p className="mt-6 text-xs font-semibold text-slate-500">{articles.length}개 콘텐츠</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
