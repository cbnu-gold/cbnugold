import { ArrowRight, CalendarDays, CheckCircle2, Instagram, Mail, Phone } from "lucide-react";
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
    <div className="bg-marble-light pb-20 pt-20 text-ink md:pb-0">
      <section className="border-b border-ink/10 bg-white py-14 md:py-20">
        <div className="mx-auto max-w-[1100px] px-5 text-center sm:px-6">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${open ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
            {phaseLabel}
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-normal sm:text-5xl">{data.recruitment.title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
            모집 일정, 지원 자격, 제출 서류를 확인하세요.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-5 py-8 sm:px-6 md:py-12">
        <div className="grid gap-3 md:grid-cols-4">
          {steps.map(([title, value], index) => (
            <div key={title} className="grid grid-cols-[2.5rem_1fr] gap-3 rounded-xl border border-ink/10 bg-white p-4 md:block md:p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/10 font-mono text-sm text-gold-dark md:block md:h-auto md:w-auto md:bg-transparent">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="font-bold md:mt-3">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 md:mt-2">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-5 rounded-xl border border-ink/10 bg-white p-5 md:mt-6 md:grid-cols-3 md:p-6">
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
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Mail className="h-5 w-5 text-gold-dark" />
              문의 채널
            </h2>
            <div className="mt-4 grid gap-2 text-sm leading-6 text-slate-600">
              <p className="font-medium text-slate-800">{data.settings.contact_name}</p>
              <a href={`tel:${data.settings.contact_phone.replace(/-/g, "")}`} className="inline-flex items-center gap-2 hover:text-ink">
                <Phone className="h-4 w-4 text-slate-400" />
                {data.settings.contact_phone}
              </a>
              <a href={`mailto:${data.settings.contact_email}`} className="inline-flex items-center gap-2 break-all hover:text-ink">
                <Mail className="h-4 w-4 text-slate-400" />
                {data.settings.contact_email}
              </a>
              {data.settings.instagram_url && (
                <a href={data.settings.instagram_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-ink">
                  <Instagram className="h-4 w-4 text-slate-400" />
                  Instagram
                </a>
              )}
              {data.settings.naver_cafe_url && (
                <a href={data.settings.naver_cafe_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-ink">
                  <span className="w-4 text-center text-sm font-bold text-slate-400">N</span>
                  Naver Cafe
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="apply-section" className="mx-auto max-w-[1100px] px-5 pb-12 sm:px-6 md:pb-24">
        <JoinForm recruitment={data.recruitment} faqs={data.faqs} isOpen={open} phase={phase} />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 px-5 py-3 shadow-[0_-12px_30px_-24px_rgba(14,20,32,0.5)] backdrop-blur md:hidden">
        <a
          href="#apply-section"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white"
        >
          {open ? "지원서 제출하기" : "모집 안내 확인"}
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
