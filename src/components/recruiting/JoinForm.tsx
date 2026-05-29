"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";
import { formatPhone, validateField, validateFile } from "@/lib/validations";
import type { FAQItem, RecruitmentCycle } from "@/types";
import type { RecruitmentPhase } from "@/lib/recruitment";

interface FormData {
  name: string;
  studentId: string;
  email: string;
  phone: string;
}

interface JoinFormProps {
  recruitment: RecruitmentCycle;
  faqs: FAQItem[];
  isOpen: boolean;
  phase: RecruitmentPhase;
}

export function JoinForm({ recruitment, faqs, isOpen, phase }: JoinFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    studentId: "",
    email: "",
    phone: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function changeField(field: keyof FormData, value: string) {
    setFormData((prev) => ({
      ...prev,
      [field]: field === "phone" ? formatPhone(value) : value,
    }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function validate() {
    const next: Record<string, string> = {};
    const name = validateField("name", formData.name);
    const studentId = validateField("studentId", formData.studentId);
    const email = validateField("email", formData.email);
    const phone = validateField("phone", formData.phone);
    const fileError = file ? validateFile(file) : "지원서 파일을 첨부해주세요";

    if (name) next.name = name;
    if (studentId) next.studentId = studentId;
    if (email) next.email = email;
    if (phone) next.phone = phone;
    if (fileError) next.file = fileError;
    if (!consent) next.consent = "개인정보 수집·이용 동의가 필요합니다";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError("");

    const payload = new FormData();
    payload.append("name", formData.name);
    payload.append("studentId", formData.studentId);
    payload.append("email", formData.email);
    payload.append("phone", formData.phone.replace(/-/g, ""));
    if (file) payload.append("file", file);

    try {
      const response = await fetch("/api/apply", { method: "POST", body: payload });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "지원서 제출에 실패했습니다");
      setSuccess(true);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "지원서 제출에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:gap-8">
      <aside className="rounded-xl border border-ink/10 bg-white p-5 md:p-6">
        <h2 className="text-xl font-bold">지원서 다운로드</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          지원서를 작성한 뒤 제출 폼에 첨부해주세요. 파일명에는 이름과 연락처를 포함해주세요.
        </p>
        <div className="mt-5 grid gap-3">
          {recruitment.docx_url && (
            <a href={recruitment.docx_url} download className="flex min-h-12 items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold hover:border-gold/40">
              <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-gold-dark" /> 워드 지원서</span>
              <Download className="h-4 w-4" />
            </a>
          )}
          {recruitment.hwp_url && (
            <a href={recruitment.hwp_url} download className="flex min-h-12 items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold hover:border-gold/40">
              <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-gold-dark" /> 한글 지원서</span>
              <Download className="h-4 w-4" />
            </a>
          )}
        </div>
        <div className="mt-6 rounded-lg bg-slate-50 p-4 text-xs leading-6 text-slate-600">
          <p className="font-semibold text-slate-800">개인정보 보유 기간</p>
          <p>{recruitment.privacy_retention}</p>
        </div>
      </aside>

      <section className="scroll-mt-24 rounded-xl border border-ink/10 bg-white p-5 md:p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">온라인 지원서 제출</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              제출 후 접수 여부를 확인할 수 있습니다.
            </p>
          </div>
          <Link
            href="/join/check"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-ink/15 px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink/30"
          >
            지원 확인
          </Link>
        </div>

        {!isOpen ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm leading-7 text-slate-600">
            {phase === "closed"
              ? "이번 기수 온라인 접수는 마감되었습니다. 다음 모집 일정은 금은동 공식 채널과 이 페이지에서 안내됩니다."
              : phase === "scheduled"
                ? "온라인 접수 시작 전입니다. 모집 시작일 이후 이 페이지에서 지원서를 제출할 수 있습니다."
                : "현재 온라인 접수가 준비 중입니다. 모집 일정이 확정되면 이 페이지에서 안내됩니다."}
          </div>
        ) : success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h3 className="mt-4 text-xl font-bold text-emerald-900">지원이 완료되었습니다</h3>
            <p className="mt-2 text-sm text-emerald-700">서류 결과는 모집 안내 일정에 맞춰 개별 안내됩니다.</p>
            <Link href="/join/check" className="mt-5 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-800">
              지원 확인하기
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            {serverError && (
              <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 md:col-span-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {serverError}
              </div>
            )}
            <InputLike label="이름" value={formData.name} error={errors.name} onChange={(value) => changeField("name", value)} />
            <InputLike label="학번" value={formData.studentId} error={errors.studentId} onChange={(value) => changeField("studentId", value)} />
            <InputLike label="이메일" type="email" value={formData.email} error={errors.email} onChange={(value) => changeField("email", value)} />
            <InputLike label="전화번호" value={formData.phone} error={errors.phone} onChange={(value) => changeField("phone", value)} />

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-center transition hover:border-gold/50 md:py-8"
              >
                <Upload className="mx-auto h-7 w-7 text-slate-400" />
                <p className="mt-3 text-sm font-semibold text-slate-700">{file ? file.name : "지원서 파일 선택"}</p>
                <p className="mt-1 text-xs text-slate-500">.hwp, .docx, .pdf · 최대 10MB</p>
              </button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".hwp,.docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                onChange={(event) => {
                  const selected = event.target.files?.[0] ?? null;
                  setFile(selected);
                  setErrors((prev) => ({ ...prev, file: selected ? "" : prev.file }));
                }}
              />
              {errors.file && <p className="mt-1 text-xs text-red-600">{errors.file}</p>}
            </div>

            <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600 md:col-span-2">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => {
                  setConsent(event.target.checked);
                  setErrors((prev) => ({ ...prev, consent: "" }));
                }}
                className="mt-1"
              />
              <span>
                성명, 학번, 이메일, 전화번호, 지원서 파일을 입부 지원 검토와 합격 여부 안내 목적으로 수집·이용하는 데 동의합니다.
              </span>
            </label>
            {errors.consent && <p className="text-xs text-red-600 md:col-span-2">{errors.consent}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60 md:col-span-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              지원서 제출하기
            </button>
          </form>
        )}
      </section>

      <section className="rounded-xl border border-ink/10 bg-white p-5 md:p-6 lg:col-span-2">
        <h2 className="text-xl font-bold">자주 묻는 질문</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {faqs.map((faq) => (
            <div key={faq.id ?? faq.question} className="rounded-lg bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">{faq.question}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function InputLike({
  label,
  value,
  onChange,
  error,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
