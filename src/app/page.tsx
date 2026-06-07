import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  FileText,
  Users,
} from "lucide-react";
import {
  getPublicCmsData,
  getPublicPage,
  getRecruitmentPhase,
  getRecruitmentPhaseLabel,
  formatKoreanDateTime,
  isRecruitmentOpen,
} from "@/lib/cms-public";
import { getShareImage, siteUrl } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPublicCmsData();
  const page = data.pages.find((item) => item.slug === "home") ?? (await getPublicPage("home"));
  const title = page?.title ?? "금은동";
  const description =
    page?.description ?? "충북대학교 금융권 취업 동아리 금은동 공식 홈페이지입니다.";
  const shareImage = getShareImage(data.settings.share_image_url, `${data.settings.site_title} 공유 이미지`);

  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${data.settings.site_title}`,
      description,
      url: siteUrl,
      siteName: data.settings.site_title,
      images: [shareImage],
    },
    twitter: {
      title: `${title} | ${data.settings.site_title}`,
      description,
      images: [shareImage.url],
    },
    alternates: {
      canonical: siteUrl,
    },
  };
}

export default async function Home() {
  const data = await getPublicCmsData();
  const hero =
    data.blocks.find((block) => block.page_slug === "home" && block.block_key === "hero") ??
    data.blocks[0];
  const philosophy = data.blocks.find(
    (block) => block.page_slug === "home" && block.block_key === "philosophy"
  );
  const philosophyItems = getPhilosophyItems(philosophy?.body);
  const heroMediaUrl = hero?.media_url ?? data.settings.share_image_url;
  const achievements2025 = data.achievements.filter((item) => item.year === 2025);
  const displayAchievements = achievements2025.length ? achievements2025 : data.achievements;
  const recruitmentOpen = isRecruitmentOpen(data.recruitment);
  const recruitmentPhase = getRecruitmentPhase(data.recruitment);
  const recruitmentLabel = getRecruitmentPhaseLabel(recruitmentPhase);
  const receiptPeriod =
    data.recruitment.start_at && data.recruitment.end_at
      ? `${formatKoreanDateTime(data.recruitment.start_at)} - ${formatKoreanDateTime(data.recruitment.end_at)}`
      : "일정 별도 안내";
  const scheduleItems = [
    ["서류 접수", receiptPeriod],
    ["서류 발표", formatKoreanDateTime(data.recruitment.document_result_at)],
    ["면접", formatKoreanDateTime(data.recruitment.interview_at)],
    ["최종 발표", formatKoreanDateTime(data.recruitment.final_result_at)],
  ];

  return (
    <div className="bg-white text-ink">
      <section className="relative overflow-hidden border-b border-ink/10 bg-white pt-20">
        <div className="absolute inset-0 gold-grid opacity-40" />
        <div className="relative mx-auto grid max-w-[1400px] items-start gap-7 px-5 pb-10 pt-8 sm:px-8 md:gap-10 md:pb-14 md:pt-12 lg:min-h-[560px] lg:grid-cols-[1.08fr_0.92fr] lg:gap-14 lg:px-16">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold-dark">
                {recruitmentOpen
                  ? `${data.recruitment.generation}기 모집 진행 중`
                  : data.settings.organization_type}
              </span>
              <span className="rounded-full border border-ink/10 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600">
                {recruitmentLabel}
              </span>
            </div>
            <h1 className="max-w-3xl text-[2.45rem] font-bold leading-[1.12] tracking-normal text-ink sm:text-5xl lg:text-6xl">
              {hero?.title ?? data.settings.hero_title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              {hero?.body ?? data.settings.hero_subtitle}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row md:mt-9">
              <Link
                href={hero?.cta_href ?? data.settings.primary_cta_href}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-800"
              >
                {hero?.cta_label ?? data.settings.primary_cta_label}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={data.settings.secondary_cta_href}
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-ink/15 bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink/30"
              >
                {data.settings.secondary_cta_label}
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-ink/10 bg-white shadow-[0_24px_70px_-45px_rgba(14,20,32,0.45)]">
            <HeroVisual src={heroMediaUrl} alt={`${data.settings.site_title} 키비주얼`} />
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between border-b border-ink/10 pb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{data.recruitment.title}</p>
                  <p className="mt-1 text-xs text-slate-500">모집 일정과 제출 안내를 확인하세요.</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    recruitmentOpen ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {recruitmentLabel}
                </span>
              </div>
              <div className="grid gap-3 py-5">
                <ProcessRow icon={CalendarDays} label="모집 기수" value={`${data.recruitment.generation}기`} />
                <ProcessRow icon={FileText} label="정규 활동" value={data.recruitment.meeting_time ?? "별도 안내"} />
                <ProcessRow icon={Users} label="지원 자격" value={data.recruitment.requirements[0] ?? "충북대학교 재학생"} />
                <ProcessRow icon={BadgeCheck} label="회비" value={data.recruitment.fee_note ?? "별도 안내"} />
              </div>
              <div className="border-t border-ink/10 py-4">
                <p className="mb-3 text-xs font-semibold text-slate-500">모집 일정</p>
                <div className="grid gap-2">
                  {scheduleItems.map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-4 text-sm">
                      <span className="shrink-0 text-slate-500">{label}</span>
                      <span className="text-right font-medium leading-5 text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Link
                  href="/join"
                  className="flex items-center justify-between rounded-lg bg-marble-light px-4 py-3 text-sm font-semibold text-ink transition hover:bg-gold/10"
                >
                  {recruitmentOpen ? "모집 상세와 지원서 제출" : "모집 안내 확인"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/join/check"
                  className="flex items-center justify-between rounded-lg border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-gold/30 hover:text-ink"
                >
                  접수 여부 확인
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-y border-ink/10 py-4 sm:grid-cols-3 lg:col-span-2 lg:max-w-2xl">
            <Metric value={data.settings.founded_label.replace(/^Est\.\s*/i, "") || "2021"} label="활동 시작" />
            <Metric value={data.recruitment.meeting_time?.split(" ")[1] ?? "화요일"} label="정기모임" />
            <Metric value={`${data.recruitment.generation}기`} label="모집 기수" />
          </div>
        </div>
      </section>

      <section className="bg-marble-light py-14 md:py-24">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-16">
          <div className="mb-8 max-w-3xl md:mb-10">
            <h2 className="text-2xl font-bold tracking-normal sm:text-4xl">주요 활동</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              신문 스크랩, 리포트 분석, 금융상품 세일즈 페어, 멘토링을 중심으로 활동합니다.
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

      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-5 sm:px-8 md:grid-cols-[0.9fr_1.1fr] md:items-start lg:px-16">
          <div>
            <p className="text-sm font-semibold text-gold-dark">운영 철학</p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal sm:text-4xl">
              {philosophy?.title ?? data.settings.brand_statement}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              {philosophy?.subtitle ?? "금융권 직무 준비를 활동 단위로 쌓습니다"}
            </p>
          </div>
          <div className="grid gap-3">
            {philosophyItems.map((item, index) => (
              <PrincipleRow key={item.title} index={index} title={item.title} description={item.description} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 md:py-24">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-16">
          <div className="mb-8 flex flex-col justify-between gap-3 border-b border-ink/10 pb-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold text-gold-dark">2025</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal sm:text-4xl">2025년 성과</h2>
            </div>
          </div>
          <ol className="divide-y divide-ink/10 border-y border-ink/10 md:grid md:grid-cols-2 md:gap-3 md:divide-y-0 md:border-y-0">
            {displayAchievements.map((item, index) => (
              <li
                key={item.id ?? `${item.title}-${index}`}
                className="grid grid-cols-[2.25rem_1fr] gap-3 py-4 md:rounded-lg md:border md:border-ink/10 md:bg-white md:px-4"
              >
                <span className="font-mono text-sm text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-semibold text-ink">{item.title}</p>
                    {item.organization && <span className="text-xs text-slate-500">{item.organization}</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{item.result}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-ink py-12 text-white md:py-16">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-6 px-5 sm:px-8 md:flex-row md:items-center lg:px-16">
          <div>
            <h2 className="text-2xl font-bold">지원 일정과 제출 안내</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">모집 일정, 지원서 양식, FAQ, 접수 확인을 제공합니다.</p>
          </div>
          <Link href="/join" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-ink sm:w-auto">
            지원 안내 보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

const fallbackPhilosophyItems = [
  {
    title: "읽고 정리합니다",
    description: "금융 뉴스와 리포트를 같은 기준으로 읽고 핵심을 남깁니다.",
  },
  {
    title: "말하고 검증합니다",
    description: "발표와 세일즈 페어에서 논리, 전달력, 질문 대응을 점검합니다.",
  },
  {
    title: "연결하고 준비합니다",
    description: "멘토링과 직무별 활동을 다음 지원 행동으로 연결합니다.",
  },
];

function getPhilosophyItems(value: string | null | undefined) {
  const lines =
    value
      ?.split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 3) ?? [];

  if (!lines.length) return fallbackPhilosophyItems;

  return lines.map((line, index) => {
    const [title, ...descriptionParts] = line.split(":");
    return {
      title: title.trim() || fallbackPhilosophyItems[index]?.title || "운영 원칙",
      description:
        descriptionParts.join(":").trim() ||
        fallbackPhilosophyItems[index]?.description ||
        "활동 기준을 명확히 정하고 실행합니다.",
    };
  });
}

function HeroVisual({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      role="img"
      aria-label={alt}
      className="relative aspect-[16/9] border-b border-ink/10 bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(120deg, rgba(255,255,255,0.02), rgba(14,20,32,0.06)), url(${JSON.stringify(src)})`,
      }}
    />
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-white/70 px-3 py-2 sm:bg-transparent sm:px-0 sm:py-0">
      <p className="font-mono text-xl font-bold tabular-nums text-ink sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function PrincipleRow({
  index,
  title,
  description,
}: {
  index: number;
  title: string;
  description: string;
}) {
  const icons = [FileText, BadgeCheck, Users];
  const Icon = icons[index] ?? BadgeCheck;

  return (
    <div className="grid grid-cols-[2.75rem_1fr] gap-3 rounded-lg border border-ink/10 bg-marble-light px-4 py-4 sm:grid-cols-[3rem_1fr]">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/25 bg-white text-gold-dark">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
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
