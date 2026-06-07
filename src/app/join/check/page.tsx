"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPhone } from "@/lib/validations";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Search,
  XCircle,
} from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "서류 검토 중",
  reviewed: "서류 검토 완료",
  interview: "면접 대상",
  accepted: "최종 합격",
  rejected: "불합격",
};

interface CheckResult {
  found: boolean;
  appliedAt?: string;
  generation?: number;
  status?: string;
}

export default function CheckPage() {
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "이름을 입력해주세요";
    if (!studentId.trim()) nextErrors.studentId = "학번을 입력해주세요";
    if (!phone.trim()) nextErrors.phone = "연락처를 입력해주세요";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setResult(null);
    setErrorMessage("");

    try {
      const response = await fetch("/api/apply/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          studentId: studentId.trim(),
          phone: phone.replace(/-/g, ""),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "조회에 실패했습니다");

      setResult(payload as CheckResult);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다"
      );
    } finally {
      setIsLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="bg-marble-light pt-20 text-ink">
      <section className="border-b border-ink/10 bg-white py-14 md:py-20">
        <div className="mx-auto max-w-[900px] px-5 text-center sm:px-6">
          <p className="text-sm font-semibold text-gold-dark">접수 조회</p>
          <h1 className="mt-4 text-3xl font-bold tracking-normal sm:text-5xl">
            지원 확인
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
            이름, 학번, 연락처를 입력하면 지원서 접수 여부를 확인할 수 있습니다.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1000px] gap-5 px-5 py-8 sm:px-6 md:grid-cols-[1fr_0.82fr] md:py-12">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm md:p-6"
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold">접수 정보 입력</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              제출 당시 입력한 정보와 동일하게 입력해주세요.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errorMessage}
            </div>
          )}

          <div className="grid gap-4">
            <InputField
              id="check-name"
              label="이름"
              value={name}
              placeholder="이름 입력"
              error={errors.name}
              onChange={(value) => {
                setName(value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
            />
            <InputField
              id="check-student-id"
              label="학번"
              value={studentId}
              placeholder="학번 입력"
              error={errors.studentId}
              onChange={(value) => {
                setStudentId(value);
                if (errors.studentId) setErrors((prev) => ({ ...prev, studentId: "" }));
              }}
            />
            <InputField
              id="check-phone"
              label="연락처"
              value={phone}
              placeholder="연락처 입력"
              error={errors.phone}
              onChange={(value) => {
                setPhone(formatPhone(value));
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
              }}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  조회 중
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  조회하기
                </>
              )}
            </button>
          </div>
        </form>

        <aside className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-xl font-bold">확인 안내</h2>
          <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-600">
            <li>· 접수 여부와 현재 선발 상태만 조회됩니다.</li>
            <li>· 지원서 파일과 세부 평가 내용은 공개되지 않습니다.</li>
            <li>· 입력 정보가 일치하지 않으면 조회되지 않습니다.</li>
          </ul>
          <Link
            href="/join"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg border border-ink/15 px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink/30"
          >
            <ArrowLeft className="h-4 w-4" />
            모집 안내로 이동
          </Link>
        </aside>

        {result && (
          <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm md:col-span-2 md:p-6">
            {result.found ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center">
                <CheckCircle className="mx-auto h-11 w-11 text-emerald-600" />
                <h2 className="mt-4 text-xl font-bold text-emerald-950">
                  지원서가 접수되었습니다
                </h2>
                <div className="mt-3 grid gap-1 text-sm text-emerald-800">
                  {result.generation && <p>모집 기수: {result.generation}기</p>}
                  {result.appliedAt && <p>접수 일시: {formatDate(result.appliedAt)}</p>}
                  {result.status && (
                    <p>현재 상태: {statusLabels[result.status] || result.status}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-center">
                <XCircle className="mx-auto h-11 w-11 text-slate-400" />
                <h2 className="mt-4 text-xl font-bold text-slate-950">
                  조회 결과가 없습니다
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  이름, 학번, 연락처를 다시 확인해주세요.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function InputField({
  id,
  label,
  value,
  placeholder,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="grid gap-1.5 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-gold focus:ring-2 focus:ring-gold/20"
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
