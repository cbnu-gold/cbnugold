import { SectionLabel } from "@/components/ui/SectionLabel";
import { Card } from "@/components/ui/Card";
import { curriculum } from "@/data/curriculum";
import { Target, Users, Network } from "lucide-react";

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

export default function AboutPage() {
  return (
    <div className="pt-24">
      {/* Intro */}
      <section className="py-24 md:py-32 bg-white marble-texture">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div>
            <SectionLabel label="About" className="mb-6" />
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              충북대학교 금융권 취업 동아리
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto">
              금은동은 2021년 신문 스크랩 동아리로 출발하여, 현재 금융권 취업을
              준비하는 충북대학교 동아리입니다. 직무잡아드림 소속으로
              신문 스크랩, 리포트 분석, 멘토링, 직무별 활동을 진행합니다.
            </p>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="py-24 md:py-32 bg-marble-light">
        <div className="max-w-6xl mx-auto px-6">
          <div>
            <SectionLabel label="Vision" className="mb-6" />
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 text-center mb-16">
              활동 방향
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {visionCards.map((card) => (
              <div key={card.title}>
                <Card className="text-center py-10">
                  <card.icon className="w-10 h-10 text-gold mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-3">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {card.description}
                  </p>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Organization */}
      <section className="py-24 md:py-32 bg-white marble-texture">
        <div className="max-w-4xl mx-auto px-6">
          <div>
            <SectionLabel label="Organization" className="mb-6" />
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 text-center mb-16">
              조직 구조
            </h2>
          </div>

          <div className="flex flex-col items-center gap-6">
            {/* 회장 */}
            <div className="bg-white border-2 border-gold/40 rounded-xl px-8 py-4 text-center shadow-sm">
              <p className="text-xs text-gold-dark uppercase tracking-wider mb-1">
                회장
              </p>
              <p className="text-lg font-semibold text-gray-900">이승현</p>
            </div>

            <div className="w-px h-6 bg-gold/25" />

            {/* 부회장 */}
            <div className="bg-white border border-gold/25 rounded-xl px-8 py-4 text-center shadow-sm">
              <p className="text-xs text-gold-dark/60 uppercase tracking-wider mb-1">
                부회장
              </p>
              <p className="text-lg font-semibold text-gray-800">전윤철</p>
            </div>

            <div className="w-px h-6 bg-gold/25" />

            {/* Teams */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
              {["은행팀", "증권팀", "보험팀", "기타"].map((team) => (
                <div
                  key={team}
                  className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center shadow-sm hover:border-gold/30 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-700">{team}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="py-16 bg-marble-light">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <span className="text-sm text-gray-400">소속 및 협력</span>
            <span className="text-gray-700 font-medium">직무잡아드림</span>
            <span className="text-gold/30">|</span>
            <span className="text-gray-700 font-medium">
              충남대 3F MOU
            </span>
          </div>
        </div>
      </section>

      {/* Curriculum */}
      <section className="py-24 md:py-32 bg-white marble-texture">
        <div className="max-w-4xl mx-auto px-6">
          <div>
            <SectionLabel label="Curriculum" className="mb-6" />
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 text-center mb-16">
              학기별 커리큘럼
            </h2>
          </div>

          <div className="space-y-12">
            {curriculum.map((semester) => (
              <div key={semester.label}>
                <h3 className="text-lg font-semibold text-gold mb-4">
                  {semester.label}
                </h3>
                <div className="space-y-3">
                  {semester.items.map((item) => (
                    <div
                      key={item.title}
                      className="flex gap-4 bg-marble-light border border-gray-200 rounded-lg p-4"
                    >
                      <span className="text-xs text-gold/70 font-mono whitespace-nowrap pt-0.5">
                        {item.month}
                      </span>
                      <div>
                        <p className="font-medium text-gray-700 text-sm">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">
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
