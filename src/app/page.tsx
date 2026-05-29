import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  FileText,
  Users,
} from "lucide-react";
import { getPublicCmsData, isRecruitmentOpen } from "@/lib/cms-public";

export const revalidate = 60;

export default async function Home() {
  const data = await getPublicCmsData();
  const hero =
    data.blocks.find((block) => block.page_slug === "home" && block.block_key === "hero") ??
    data.blocks[0];
  const placements = data.achievements.filter((item) => item.kind === "placement");
  const awards = data.achievements.filter((item) => item.kind === "award");
  const recruitmentOpen = isRecruitmentOpen(data.recruitment);

  return (
    <div className="bg-white text-ink">
      <section className="relative overflow-hidden border-b border-ink/10 bg-white pt-20">
        <div className="absolute inset-0 gold-grid opacity-40" />
        <div className="relative mx-auto grid min-h-[640px] max-w-[1400px] items-center gap-12 px-6 pb-16 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-16">
          <div>
            <p className="mb-5 text-sm font-semibold text-gold-dark">
              {recruitmentOpen ? `${data.recruitment.generation}기 모집 진행 중` : "공식 홈페이지 운영 중"}
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-normal text-ink sm:text-5xl lg:text-6xl">
              {hero?.title ?? data.settings.hero_title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              {hero?.body ?? data.settings.hero_subtitle}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href={hero?.cta_href ?? data.settings.primary_cta_href}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-800"
              >
                {hero?.cta_label ?? data.settings.primary_cta_label}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={data.settings.secondary_cta_href}
                className="inline-flex items-center justify-center rounded-lg border border-ink/15 bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink/30"
              >
                {data.settings.secondary_cta_label}
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-3 border-y border-ink/10 py-5">
              <Metric value={`${data.history.length}+`} label="축적 연혁" />
              <Metric value={`${placements.length}+`} label="취업·인턴 기록" />
              <Metric value={`${awards.length}+`} label="수상 실적" />
            </div>
          </div>

          <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-[0_24px_70px_-45px_rgba(14,20,32,0.45)]">
            <div className="flex items-center justify-between border-b border-ink/10 pb-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{data.recruitment.title}</p>
                <p className="mt-1 text-xs text-slate-500">지원 일정과 제출 현황은 관리자 대시보드에서 관리됩니다.</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  recruitmentOpen ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                }`}
              >
                {recruitmentOpen ? "모집중" : "준비중"}
              </span>
            </div>
            <div className="grid gap-3 py-5">
              <ProcessRow icon={CalendarDays} label="모집 기수" value={`${data.recruitment.generation}기`} />
              <ProcessRow icon={FileText} label="정규 활동" value={data.recruitment.meeting_time ?? "별도 안내"} />
              <ProcessRow icon={Users} label="지원 자격" value={data.recruitment.requirements[0] ?? "충북대학교 재학생"} />
              <ProcessRow icon={BadgeCheck} label="회비" value={data.recruitment.fee_note ?? "별도 안내"} />
            </div>
            <Link
              href="/join"
              className="flex items-center justify-between rounded-lg bg-marble-light px-4 py-3 text-sm font-semibold text-ink transition hover:bg-gold/10"
            >
              모집 상세와 지원서 제출
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-marble-light py-20 md:py-28">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-16">
          <div className="mb-10 max-w-3xl">
            <h2 className="text-3xl font-bold tracking-normal sm:text-4xl">지원자가 바로 이해하는 활동 구조</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              금은동은 금융권 채용에 필요한 시장 이해, 직무 이해, 말하기 역량을 반복 가능한 활동으로 설계합니다.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {data.activities.slice(0, 3).map((activity, index) => (
              <article key={activity.id ?? activity.title} className="rounded-xl border border-ink/10 bg-white p-6">
                <span className="font-mono text-sm text-gold-dark">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="mt-5 text-xl font-bold">{activity.title}</h3>
                {activity.subtitle && <p className="mt-1 text-sm font-medium text-slate-500">{activity.subtitle}</p>}
                <p className="mt-4 text-sm leading-7 text-slate-600">{activity.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {activity.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full border border-gold/20 px-2.5 py-1 text-xs text-gold-dark">
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-6 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-16">
          <div>
            <h2 className="text-3xl font-bold tracking-normal sm:text-4xl">성과와 기록을 숨기지 않습니다</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              취업·인턴·수상 기록은 지원자가 동아리의 실질성을 판단하는 핵심 근거입니다.
            </p>
            <div className="mt-8 grid gap-3">
              <ProofItem icon={BriefcaseBusiness} label="취업·인턴" value={`${placements.length}건`} />
              <ProofItem icon={BarChart3} label="외부 성과" value={`${awards.length}건`} />
              <ProofItem icon={BookOpen} label="위키 콘텐츠" value={`${data.wikiArticles.length}개`} />
            </div>
          </div>
          <div className="rounded-xl border border-ink/10">
            {data.achievements.slice(0, 8).map((item, index) => (
              <div key={item.id ?? `${item.title}-${index}`} className="grid grid-cols-[56px_1fr_auto] gap-4 border-b border-ink/10 px-5 py-4 last:border-b-0">
                <span className="font-mono text-sm text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  {item.organization && <p className="mt-1 text-xs text-slate-500">{item.organization}</p>}
                </div>
                <p className="text-right text-sm font-medium text-slate-700">{item.result}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink py-16 text-white">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-6 px-6 sm:px-8 md:flex-row md:items-center lg:px-16">
          <div>
            <h2 className="text-2xl font-bold">지원자에게 필요한 정보는 한 페이지에서 끝나야 합니다.</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">모집 일정, 지원서, FAQ, 제출 확인까지 `/join`에서 확인할 수 있습니다.</p>
          </div>
          <Link href="/join" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-ink">
            지원 안내 보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-mono text-2xl font-bold tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function ProcessRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-slate-50 px-4 py-3">
      <Icon className="mt-0.5 h-4 w-4 text-gold-dark" />
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function ProofItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-ink/10 px-4 py-3">
      <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
        <Icon className="h-4 w-4 text-gold-dark" />
        {label}
      </span>
      <span className="font-mono text-sm font-bold">{value}</span>
    </div>
  );
}
