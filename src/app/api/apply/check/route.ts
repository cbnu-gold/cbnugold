import { NextRequest, NextResponse } from "next/server";
import { buildApplicantCheckScopes } from "@/lib/application-check";
import { createServerClient } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { validationRules } from "@/lib/validations";
import type { RecruitmentCycle } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const rateLimit = checkRateLimit(`apply-check:${ip}`, 10, 10 * 60 * 1000);

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: "짧은 시간 안에 조회 시도가 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "지원 확인 요청 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }
    const name = String(body.name ?? "").trim();
    const studentId = String(body.studentId ?? "").replace(/\D/g, "");
    const phone = String(body.phone ?? "").replace(/\D/g, "");

    if (!name || !validationRules.name.pattern.test(name)) {
      return NextResponse.json({ error: "올바른 이름을 입력해주세요" }, { status: 400 });
    }
    if (!studentId || !validationRules.studentId.pattern.test(studentId)) {
      return NextResponse.json({ error: "올바른 학번을 입력해주세요" }, { status: 400 });
    }
    if (!phone || !validationRules.phone.pattern.test(phone)) {
      return NextResponse.json({ error: "올바른 전화번호를 입력해주세요" }, { status: 400 });
    }

    let supabase;
    try {
      supabase = createServerClient();
    } catch {
      return NextResponse.json(
        { error: "서비스가 일시적으로 사용할 수 없습니다." },
        { status: 503 }
      );
    }

    const { data: cycleData, error: cycleError } = await supabase
      .from("recruitment_cycles")
      .select("id,generation")
      .eq("status", "published")
      .order("generation", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cycleError) {
      console.error("Recruitment cycle lookup error:", cycleError);
      return NextResponse.json(
        { error: "조회 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    const scopes = buildApplicantCheckScopes(cycleData as RecruitmentCycle | null);
    if (scopes.length === 0) {
      return NextResponse.json(
        { error: "모집 설정을 확인하는 중입니다. 운영진에게 문의해주세요." },
        { status: 503 }
      );
    }

    const lookupResults = await Promise.all(
      scopes.map((scope) => {
        let query = supabase
          .from("applicants")
          .select("name, student_id, applied_at, status, generation, recruitment_cycle_id")
          .eq("name", name)
          .eq("student_id", studentId)
          .eq("phone", phone)
          .eq("generation", scope.generation)
          .order("applied_at", { ascending: false })
          .limit(1);

        query =
          scope.kind === "cycle"
            ? query.eq("recruitment_cycle_id", scope.recruitmentCycleId)
            : query.is("recruitment_cycle_id", null);

        return query.maybeSingle();
      })
    );

    const lookupError = lookupResults.find((result) => result.error)?.error;
    if (lookupError) {
      console.error("Applicant lookup error:", lookupError);
      return NextResponse.json(
        { error: "조회 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    type ApplicantLookup = NonNullable<(typeof lookupResults)[number]["data"]>;
    const applicants = lookupResults
      .map((result) => result.data)
      .filter((applicant): applicant is ApplicantLookup => applicant !== null);
    const data = applicants.sort((a, b) => {
      const bTime = new Date(b.applied_at).getTime();
      const aTime = new Date(a.applied_at).getTime();
      return bTime - aTime;
    })[0];

    if (!data) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      appliedAt: data.applied_at,
      generation: data.generation,
      status: data.status,
    });
  } catch (error) {
    console.error("Check application error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
