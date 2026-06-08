"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { validateAndNormalizeApplicationAnswers } from "@/lib/application-questions";
import { formatPhone, validateField, validateFile } from "@/lib/validations";
import type { ApplicationQuestion, FAQItem, RecruitmentCycle } from "@/types";
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
  const [applicationAnswers, setApplicationAnswers] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const fileErrorId = useId();
  const applicationQuestions = recruitment.application_questions ?? [];
  const requiresFile = recruitment.requires_file !== false;
  const hasApplicationTemplate = Boolean(recruitment.docx_url || recruitment.hwp_url);

  function changeField(field: keyof FormData, value: string) {
    setFormData((prev) => ({
      ...prev,
      [field]: field === "phone" ? formatPhone(value) : value,
    }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function changeFile(selected: File | null) {
    setFile(selected);
    setErrors((prev) => ({
      ...prev,
      file: selected ? validateFile(selected) ?? "" : "",
    }));
  }

  function changeApplicationAnswer(questionId: string, value: string) {
    setApplicationAnswers((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => ({ ...prev, applicationAnswers: "" }));
  }

  function clearFile() {
    if (fileRef.current) fileRef.current.value = "";
    changeFile(null);
  }

  function validate() {
    const next: Record<string, string> = {};
    const name = validateField("name", formData.name);
    const studentId = validateField("studentId", formData.studentId);
    const email = validateField("email", formData.email);
    const phone = validateField("phone", formData.phone);
    const fileError = file ? validateFile(file) : requiresFile ? "지원서 파일을 첨부해주세요" : null;
    const answerResult = validateAndNormalizeApplicationAnswers(applicationQuestions, applicationAnswers);

    if (name) next.name = name;
    if (studentId) next.studentId = studentId;
    if (email) next.email = email;
    if (phone) next.phone = phone;
    if (fileError) next.file = fileError;
    if (answerResult.error) next.applicationAnswers = answerResult.error;
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
    payload.append("applicationAnswers", JSON.stringify(applicationAnswers));
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
        <h2 className="text-xl font-bold">{hasApplicationTemplate ? "지원서 다운로드" : "제출 안내"}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {hasApplicationTemplate
            ? "지원서를 작성한 뒤 제출 폼에 첨부해주세요. 파일명은 이름_지원서 형식을 권장합니다."
            : "이번 모집은 온라인 입력 항목을 기준으로 접수합니다. 운영진 안내가 있는 경우에만 파일을 첨부해주세요."}
        </p>
        {hasApplicationTemplate && (
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
        )}
        <div className="mt-6 rounded-lg bg-slate-50 p-4 text-xs leading-6 text-slate-600">
          <p className="font-semibold text-slate-800">개인정보 보유 기간</p>
          <p>{recruitment.privacy_retention}</p>
        </div>
        <div className="mt-4 rounded-lg border border-ink/10 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">제출 전 확인</p>
          <ul className="mt-3 grid gap-2 text-xs leading-5 text-slate-600">
            <li>· 첨부 파일 형식은 hwp, docx, pdf 중 하나여야 합니다.</li>
            <li>· 파일 첨부는 {requiresFile ? "필수" : "선택"}입니다.</li>
            <li>· 제출 후 지원 확인 페이지에서 접수 여부를 확인할 수 있습니다.</li>
          </ul>
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
            {applicationQuestions.length > 0 && (
              <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">추가 질문</p>
                  <p className="mt-1 text-xs text-slate-500">운영진이 이번 모집에 필요한 항목만 확인합니다.</p>
                </div>
                <div className="grid gap-3">
                  {applicationQuestions.map((question) => (
                    <ApplicationQuestionInput
                      key={question.id}
                      question={question}
                      value={applicationAnswers[question.id] ?? ""}
                      onChange={(value) => changeApplicationAnswer(question.id, value)}
                    />
                  ))}
                </div>
                {errors.applicationAnswers && (
                  <p className="text-xs text-red-600" role="alert">
                    {errors.applicationAnswers}
                  </p>
                )}
              </div>
            )}

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-describedby={errors.file ? fileErrorId : undefined}
                className={`w-full rounded-xl border border-dashed px-5 py-6 text-center transition md:py-8 ${
                  errors.file
                    ? "border-red-300 bg-red-50/70"
                    : "border-slate-300 bg-slate-50 hover:border-gold/50"
                }`}
              >
                <Upload className="mx-auto h-7 w-7 text-slate-400" />
                <p className="mx-auto mt-3 max-w-full truncate text-sm font-semibold text-slate-700">
                  {file ? file.name : requiresFile ? "지원서 파일 선택" : "첨부 파일 선택(선택)"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {file ? `${formatFileSize(file.size)} · hwp/docx/pdf` : ".hwp, .docx, .pdf · 최대 10MB"}
                </p>
              </button>
              {file && (
                <div className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{file.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:border-ink/20 hover:text-ink"
                  >
                    <X className="h-3.5 w-3.5" />
                    파일 해제
                  </button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".hwp,.docx,.pdf,application/x-hwp,application/haansofthwp,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                onChange={(event) => {
                  changeFile(event.target.files?.[0] ?? null);
                }}
              />
              {errors.file && (
                <p id={fileErrorId} className="mt-1 text-xs text-red-600" role="alert">
                  {errors.file}
                </p>
              )}
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
                성명, 학번, 이메일, 전화번호{requiresFile || file ? ", 첨부 파일" : ""}을 신청 검토와 결과 안내 목적으로 수집·이용하는 데 동의합니다.
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

function ApplicationQuestionInput({
  question,
  value,
  onChange,
}: {
  question: ApplicationQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputId = useId();

  return (
    <label htmlFor={inputId} className="grid gap-1.5 text-sm">
      <span className="font-medium text-slate-700">
        {question.label}
        {question.required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {question.type === "long_text" ? (
        <textarea
          id={inputId}
          value={value}
          rows={4}
          maxLength={1200}
          placeholder={question.placeholder ?? undefined}
          onChange={(event) => onChange(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
        />
      ) : question.type === "select" ? (
        <select
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
        >
          <option value="">선택해주세요</option>
          {(question.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={inputId}
          type="text"
          value={value}
          maxLength={200}
          placeholder={question.placeholder ?? undefined}
          onChange={(event) => onChange(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
        />
      )}
    </label>
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
  const inputId = useId();
  const errorId = `${inputId}-error`;

  return (
    <label htmlFor={inputId} className="grid gap-1.5 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
      />
      {error && <span id={errorId} className="text-xs text-red-600">{error}</span>}
    </label>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
