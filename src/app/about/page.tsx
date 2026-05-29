import { Card } from "@/components/ui/Card";
import { curriculum } from "@/data/curriculum";
import { getPublicCmsData } from "@/lib/cms-public";
import type { ContentBlock } from "@/types";
import { Network, Target, Users } from "lucide-react";

const visionCards = [
  {
    icon: Target,
    title: "시장 이해",
    description:
      "금융시장 분석, 신문 스크랩, 리서치 리포트 작성으로 시장과 산업을 읽는 연습을 합니다.",
  },
  {
    icon: Users,
    title: "직무 준비",
    description:
      "모의면접, 포트폴리오 실습, 투자대회 참여를 통해 면접·발표·분석 경험을 쌓습니다.",
  },
  {
    icon: Network,
    title: "네트워크",
    description:
      "연합 활동, 알럼나이 교류, 멘토링으로 금융권 직무 정보를 공유합니다.",
  },
];

function findBlock(blocks: ContentBlock[], key: string) {
  return blocks.find((block) => block.page_slug === "about" && block.block_key === key);
}

export default async function AboutPage() {
  const data = await getPublicCmsData();
  const intro = findBlock(data.blocks, "intro");
  const partners = findBlock(data.blocks, "partners");
  const currentHistory =
    data.history.find((entry) => entry.is_current) ??
    [...data.history].sort((a, b) => b.year - a.year)[0];

  return (
    <div className="bg-white pt-20 text-ink">
      <section className="border-b border-ink/10 bg-white py-14 marble-texture md:py-20">
        <div className="mx-auto max-w-4xl px-5 text-center sm:px-6">
          <p className="text-sm font-semibold text-gold-dark">
            {intro?.subtitle ?? "금은동 소개"}
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-normal text-ink sm:text-5xl">
            {intro?.title ?? "충북대학교 금융권 취업 동아리"}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            {intro?.body ??
              "금은동은 2021년 신문 스크랩 동아리로 출발하여, 현재 금융권 취업을 준비하는 충북대학교 동아리입니다."}
          </p>
        </div>
      </section>

      <section className="bg-marble-light py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="mb-8 text-center md:mb-10">
            <p className="text-sm font-semibold text-gold-dark">운영 기준</p>
            <h2 className="mt-3 text-2xl font-bold tracking-normal md:text-4xl">
              활동 방향
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
            {visionCards.map((card) => (
              <Card key={card.title} className="py-7 text-center md:py-9">
                <card.icon className="mx-auto mb-4 h-9 w-9 text-gold" />
                <h3 className="mb-3 text-lg font-bold text-ink md:text-xl">
                  {card.title}
                </h3>
                <p className="text-sm leading-7 text-slate-600">
                  {card.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 marble-texture md:py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div className="mb-8 text-center md:mb-10">
            <p className="text-sm font-semibold text-gold-dark">운영 체계</p>
            <h2 className="mt-3 text-2xl font-bold tracking-normal md:text-4xl">
              조직 구조
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-xl border border-gold/30 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold text-gold-dark">현재 운영</p>
              <p className="mt-3 text-2xl font-bold text-ink">
                {currentHistory?.president ?? "운영진"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {currentHistory?.generation
                  ? `${currentHistory.generation}기 운영진 기준`
                  : "운영진 기준"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {["은행팀", "증권팀", "보험팀", "기타"].map((team) => (
                <div
                  key={team}
                  className="rounded-lg border border-ink/10 bg-marble-light px-4 py-4 text-center"
                >
                  <p className="text-sm font-semibold text-slate-800">{team}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-marble-light py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div className="rounded-xl border border-ink/10 bg-white p-5 md:p-6">
            <p className="text-sm font-semibold text-gold-dark">
              {partners?.title ?? "소속 및 협력"}
            </p>
            <p className="mt-3 text-lg font-bold text-ink">
              {partners?.subtitle ?? "직무잡아드림 · 충남대 3F MOU"}
            </p>
            {partners?.body && (
              <p className="mt-2 text-sm leading-6 text-slate-600">{partners.body}</p>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div className="mb-8 md:mb-10">
            <p className="text-sm font-semibold text-gold-dark">운영 이력</p>
            <h2 className="mt-3 text-2xl font-bold tracking-normal md:text-4xl">
              연혁
            </h2>
          </div>

          <ol className="divide-y divide-ink/10 border-y border-ink/10">
            {data.history.map((entry) => (
              <li key={entry.id ?? `${entry.year}-${entry.generation}`} className="grid gap-4 py-5 md:grid-cols-[9rem_1fr]">
                <div>
                  <p className="font-mono text-xl font-bold tabular-nums text-ink">
                    {entry.year}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {entry.generation ? `${entry.generation}기` : "기수 별도"}
                    {entry.is_current ? " · 현재" : ""}
                  </p>
                </div>
                <div>
                  {entry.president && (
                    <p className="font-semibold text-slate-900">회장 {entry.president}</p>
                  )}
                  <ul className="mt-2 grid gap-1 text-sm leading-6 text-slate-600">
                    {entry.milestones.map((milestone) => (
                      <li key={milestone}>· {milestone}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-marble-light py-14 md:py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-6">
          <div className="mb-8 text-center md:mb-10">
            <p className="text-sm font-semibold text-gold-dark">학기 운영</p>
            <h2 className="mt-3 text-2xl font-bold tracking-normal md:text-4xl">
              학기별 커리큘럼
            </h2>
          </div>

          <div className="space-y-7 md:space-y-9">
            {curriculum.map((semester) => (
              <div key={semester.label}>
                <h3 className="mb-4 text-lg font-bold text-gold-dark">
                  {semester.label}
                </h3>
                <div className="space-y-3">
                  {semester.items.map((item) => (
                    <div
                      key={item.title}
                      className="grid grid-cols-[4rem_1fr] gap-3 rounded-lg border border-ink/10 bg-white p-4 sm:gap-4"
                    >
                      <span className="pt-0.5 font-mono text-xs text-gold-dark/80">
                        {item.month}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {item.title}
                        </p>
                        <p className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-500">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
