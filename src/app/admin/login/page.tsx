"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase";
import { Loader2, AlertCircle } from "lucide-react";

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
        setError("이메일 또는 비밀번호가 올바르지 않습니다");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("로그인에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt-24 min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-sm w-full mx-auto px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-950 mb-2">
            관리자 로그인
          </h1>
          <p className="text-sm text-slate-400">
            금은동 관리자 계정으로 로그인하세요
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            id="email"
            label="이메일"
            type="email"
            placeholder="admin@cbnugold.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="password"
            label="비밀번호"
            type="password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={loading} className="w-full" size="md">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                로그인 중...
              </span>
            ) : (
              "로그인"
            )}
          </Button>
        </form>
        </div>
      </div>
    </div>
  );
}
