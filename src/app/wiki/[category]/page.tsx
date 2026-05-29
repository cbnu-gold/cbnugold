import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPublicCmsData } from "@/lib/cms-public";
import { fallbackWikiArticles } from "@/lib/cms-fallback";

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  return Array.from(new Set(fallbackWikiArticles.map((item) => item.category)))
    .filter((category) => category !== "games")
    .map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const data = await getPublicCmsData();
  const first = data.wikiArticles.find((item) => item.category === category);
  if (!first) return { title: "Wiki" };

  return {
    title: `${first.title} · Wiki`,
    description: first.summary,
  };
}

export default async function WikiCategoryPage({ params }: PageProps) {
  const { category } = await params;
  if (category === "games") redirect("/wiki/games");

  const data = await getPublicCmsData();
  const articles = data.wikiArticles.filter((item) => item.category === category);
  if (!articles.length) notFound();

  const first = articles[0];

  return (
    <div className="bg-marble-light pt-24 text-ink">
      <section className="border-b border-ink/10 bg-white py-16 md:py-24">
        <div className="mx-auto max-w-[1000px] px-6">
          <Link href="/wiki" className="text-sm font-semibold text-gold-dark">← Wiki</Link>
          <h1 className="mt-5 text-4xl font-bold tracking-normal sm:text-5xl">{first.title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">{first.summary}</p>
        </div>
      </section>

      <section className="mx-auto max-w-[1000px] px-6 py-14 md:py-20">
        <div className="grid gap-4">
          {articles.map((article, index) => (
            <article key={article.id ?? article.slug} className="rounded-xl border border-ink/10 bg-white p-6">
              <span className="font-mono text-sm text-gold-dark">{String(index + 1).padStart(2, "0")}</span>
              <h2 className="mt-3 text-2xl font-bold">{article.title}</h2>
              {article.title_en && <p className="mt-1 text-sm text-slate-500">{article.title_en}</p>}
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">{article.body || article.summary}</p>
              {article.source_note && (
                <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">출처/검수 메모: {article.source_note}</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
