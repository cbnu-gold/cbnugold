"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatPhone } from "@/lib/validations";
import {
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
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
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "이름을 입력해주세요";
    if (!studentId.trim()) errs.studentId = "학번을 입력해주세요";
    if (!phone.trim()) errs.phone = "연락처를 입력해주세요";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setResult(null);
    setErrorMessage("");

    try {
      const res = await fetch("/api/apply/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          studentId: studentId.trim(),
          phone: phone.replace(/-/g, ""),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "조회에 실패했습니다");
      }

      const data: CheckResult = await res.json();
      setResult(data);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다"
      );
    } finally {
      setIsLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="pt-24">
      <section className="py-20 md:py-28 bg-white marble-texture min-h-[70vh]">
        <div className="max-w-md mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <SectionLabel label="접수 조회" className="mb-6" />
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 text-center mb-3">
              지원 확인
            </h2>
            <p className="text-gray-500 text-center mb-10">
              이름, 학번, 연락처를 입력하면 지원서 접수 여부를 확인할 수
              있습니다
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{errorMessage}</p>
              </div>
            )}

            <Input
              id="check-name"
              label="이름"
              placeholder="홍길동"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name)
                  setErrors((prev) => ({ ...prev, name: "" }));
              }}
              error={errors.name}
            />
            <Input
              id="check-studentId"
              label="학번"
              placeholder="2021123456"
              required
              value={studentId}
              onChange={(e) => {
                setStudentId(e.target.value);
                if (errors.studentId)
                  setErrors((prev) => ({ ...prev, studentId: "" }));
              }}
              error={errors.studentId}
            />
            <Input
              id="check-phone"
              label="연락처"
              placeholder="010-1234-5678"
              required
              value={phone}
              onChange={(e) => {
                setPhone(formatPhone(e.target.value));
                if (errors.phone)
                  setErrors((prev) => ({ ...prev, phone: "" }));
              }}
              error={errors.phone}
            />

            <Button type="submit" disabled={isLoading} className="w-full" size="lg">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  조회 중...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  조회하기
                </span>
              )}
            </Button>
          </form>

          {/* 결과 */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              {result.found ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    지원서가 접수되었습니다
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      접수 일시:{" "}
                      <span className="font-medium">
                        {formatDate(result.appliedAt!)}
                      </span>
                    </p>
                    <p>
                      현재 상태:{" "}
                      <span className="font-medium text-gold">
                        {statusLabels[result.status!] || result.status}
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl text-center">
                  <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    조회 결과가 없습니다
                  </h3>
                  <p className="text-sm text-gray-500">
                    입력한 정보와 일치하는 지원 내역이 없습니다.
                    <br />
                    이름, 학번, 연락처를 다시 확인해주세요.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
