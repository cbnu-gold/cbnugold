"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-marble-light pt-20 text-ink">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[1100px] items-start px-5 py-8 sm:px-8 lg:items-center lg:px-16">
        <div className="grid w-full gap-6 lg:grid-cols-[0.9fr_1fr] lg:items-center">
          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-gold-dark">관리자 접근</p>
            <h1 className="mt-3 text-4xl font-bold tracking-normal text-ink">
              콘텐츠와 모집 운영을 한곳에서 관리합니다.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-600">
              승인된 Supabase Auth 계정과 관리자 권한이 연결된 계정만 대시보드에 접근할 수 있습니다.
            </p>
            <div className="mt-7 grid gap-3 text-sm text-slate-600">
              <div className="rounded-lg border border-ink/10 bg-white px-4 py-3">
                지원자 개인정보와 파일은 권한별로 분리합니다.
              </div>
              <div className="rounded-lg border border-ink/10 bg-white px-4 py-3">
                콘텐츠, 모집 일정, 미디어, FAQ를 웹에서 수정합니다.
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm rounded-xl border border-ink/10 bg-white p-6 shadow-[0_24px_70px_-50px_rgba(14,20,32,0.45)]">
            <div className="mb-7 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-gold-dark">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold text-slate-950">관리자 로그인</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                승인된 운영 계정으로 로그인하세요.
              </p>
            </div>

            {error && (
              <div className="mb-5 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                id="email"
                label="이메일"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                id="password"
                label="비밀번호"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit" disabled={loading} className="min-h-12 w-full" size="md">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    로그인 중...
                  </span>
                ) : (
                  "로그인"
                )}
              </Button>
            </form>

            <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
              계정은 Supabase Auth와 관리자 프로필이 모두 승인된 경우에만 사용할 수 있습니다.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
