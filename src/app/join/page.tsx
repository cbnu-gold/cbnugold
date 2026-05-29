import { CalendarDays, CheckCircle2 } from "lucide-react";
import { JoinForm } from "@/components/recruiting/JoinForm";
import {
  formatKoreanDateTime,
  getPublicCmsData,
  getRecruitmentPhase,
  getRecruitmentPhaseLabel,
  isRecruitmentOpen,
} from "@/lib/cms-public";

export const revalidate = 60;

export default async function JoinPage() {
  const data = await getPublicCmsData();
  const open = isRecruitmentOpen(data.recruitment);
  const phase = getRecruitmentPhase(data.recruitment);
  const phaseLabel = getRecruitmentPhaseLabel(phase);

  const steps = [
    ["서류 접수", `${formatKoreanDateTime(data.recruitment.start_at)} ~ ${formatKoreanDateTime(data.recruitment.end_at)}`],
    ["서류 발표", formatKoreanDateTime(data.recruitment.document_result_at)],
    ["면접", formatKoreanDateTime(data.recruitment.interview_at)],
    ["최종 발표", formatKoreanDateTime(data.recruitment.final_result_at)],
  ];

  return (
    <div className="bg-marble-light pt-24 text-ink">
      <section className="border-b border-ink/10 bg-white py-16 md:py-24">
        <div className="mx-auto max-w-[1100px] px-6 text-center">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${open ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
            {phaseLabel}
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-normal sm:text-5xl">{data.recruitment.title}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">
            모집 일정, 지원 자격, 제출 서류를 확인하세요.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-6 py-10 md:py-14">
        <div className="grid gap-4 md:grid-cols-4">
          {steps.map(([title, value], index) => (
            <div key={title} className="rounded-xl border border-ink/10 bg-white p-5">
              <span className="font-mono text-sm text-gold-dark">{String(index + 1).padStart(2, "0")}</span>
              <h2 className="mt-3 font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 rounded-xl border border-ink/10 bg-white p-6 md:grid-cols-2">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <CheckCircle2 className="h-5 w-5 text-gold-dark" />
              지원 자격
            </h2>
            <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-600">
              {data.recruitment.requirements.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <CalendarDays className="h-5 w-5 text-gold-dark" />
              정규 활동
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">{data.recruitment.meeting_time}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{data.recruitment.fee_note}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-6 pb-20 md:pb-28">
        <JoinForm recruitment={data.recruitment} faqs={data.faqs} isOpen={open} phase={phase} />
      </section>
    </div>
  );
}
