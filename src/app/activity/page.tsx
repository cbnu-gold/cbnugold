import { getPublicCmsData } from "@/lib/cms-public";

export const revalidate = 60;

export default async function ActivityPage() {
  const data = await getPublicCmsData();
  const regular = data.activities.filter((item) => item.category === "regular");
  const special = data.activities.filter((item) => item.category !== "regular");

  return (
    <div className="bg-marble-light pt-20 text-ink">
      <section className="border-b border-ink/10 bg-white py-14 md:py-20">
        <div className="mx-auto max-w-[1000px] px-5 text-center sm:px-6">
          <h1 className="text-3xl font-bold tracking-normal sm:text-5xl">금은동의 활동</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
            정기 활동과 특별 활동을 구분해 안내합니다.
          </p>
        </div>
      </section>

      <ActivitySection title="정규 활동" description="매주 진행하는 시장 읽기, 리포트 분석, 발표 활동입니다." items={regular.length ? regular : data.activities} />
      <ActivitySection title="특별 활동" description="멘토링, 연합 활동, 외부 프로젝트처럼 경험 폭을 넓히는 활동입니다." items={special} />
    </div>
  );
}

function ActivitySection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: Awaited<ReturnType<typeof getPublicCmsData>>["activities"];
}) {
  if (!items.length) return null;

  return (
    <section className="mx-auto max-w-[1200px] px-5 py-10 sm:px-6 md:py-16">
      <div className="mb-6 max-w-2xl md:mb-8">
        <h2 className="text-2xl font-bold tracking-normal">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <article key={item.id ?? `${item.title}-${index}`} className="rounded-xl border border-ink/10 bg-white p-5 md:p-6">
            <span className="font-mono text-sm text-gold-dark">{String(index + 1).padStart(2, "0")}</span>
            <h3 className="mt-4 text-lg font-bold md:text-xl">{item.title}</h3>
            {item.subtitle && <p className="mt-1 text-sm font-medium text-slate-500">{item.subtitle}</p>}
            <p className="mt-4 text-sm leading-7 text-slate-600">{item.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-gold/20 px-2.5 py-1 text-xs text-gold-dark">
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
