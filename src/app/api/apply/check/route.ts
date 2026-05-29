import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { validationRules } from "@/lib/validations";

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

    const body = await request.json();
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

    const { data, error } = await supabase
      .from("applicants")
      .select("name, student_id, applied_at, status")
      .eq("name", name)
      .eq("student_id", studentId)
      .eq("phone", phone)
      .order("applied_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Applicant lookup error:", error);
      return NextResponse.json(
        { error: "조회 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      appliedAt: data.applied_at,
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
