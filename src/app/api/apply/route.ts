import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getResendClient, buildAdminEmail } from "@/lib/resend";
import { validationRules, fileRules } from "@/lib/validations";
import type { RecruitmentCycle } from "@/types";

function getStorageTroubleshootingHint(message?: string) {
  if (!message) return "버킷 이름(applications), 파일 크기 제한(10MB), 그리고 Vercel 환경변수(NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)를 확인해주세요.";

  if (message.includes("Bucket not found")) {
    return "Storage에 applications 버킷이 실제로 생성되어 있는지 확인해주세요.";
  }
  if (message.includes("row-level security") || message.includes("permission")) {
    return "storage.objects 정책(INSERT/SELECT) 또는 서비스 롤 키가 올바른지 확인해주세요.";
  }
  if (message.toLowerCase().includes("jwt") || message.toLowerCase().includes("invalid key")) {
    return "SUPABASE_SERVICE_ROLE_KEY가 정확한지, Vercel에 최신 값으로 설정되었는지 확인해주세요.";
  }

  return "Storage 버킷/권한/환경변수를 다시 확인해주세요.";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const name = formData.get("name") as string;
    const studentId = formData.get("studentId") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const file = formData.get("file") as File;

    if (!name || !validationRules.name.pattern.test(name)) {
      return NextResponse.json({ error: "올바른 이름을 입력해주세요" }, { status: 400 });
    }
    if (!studentId || !validationRules.studentId.pattern.test(studentId)) {
      return NextResponse.json({ error: "올바른 학번을 입력해주세요" }, { status: 400 });
    }
    if (!email || !validationRules.email.pattern.test(email)) {
      return NextResponse.json({ error: "올바른 이메일을 입력해주세요" }, { status: 400 });
    }
    if (!phone || !validationRules.phone.pattern.test(phone)) {
      return NextResponse.json({ error: "올바른 전화번호를 입력해주세요" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "파일을 첨부해주세요" }, { status: 400 });
    }

    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!fileRules.allowedExtensions.includes(ext)) {
      return NextResponse.json({ error: fileRules.message }, { status: 400 });
    }
    if (file.size > fileRules.maxSize) {
      return NextResponse.json({ error: "파일 크기는 10MB 이하여야 합니다" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: cycleData } = await supabase
      .from("recruitment_cycles")
      .select("*")
      .eq("status", "published")
      .order("generation", { ascending: false })
      .limit(1)
      .maybeSingle();

    const activeCycle = cycleData as RecruitmentCycle | null;
    const now = Date.now();
    const isOpen =
      !activeCycle ||
      (activeCycle.is_open &&
        (!activeCycle.end_at || now <= new Date(activeCycle.end_at).getTime()));

    if (!isOpen) {
      return NextResponse.json(
        { error: "현재 모집 접수 기간이 아닙니다." },
        { status: 403 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const generation = activeCycle?.generation ?? 9;
    const timestamp = Date.now();
    const safeStudentId = studentId.replace(/\D/g, "");
    const filePath = `${generation}/${safeStudentId}_${timestamp}${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("applications")
      .upload(filePath, fileBuffer, {
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      const detailedMessage = uploadError.message || "unknown error";
      return NextResponse.json(
        {
          error: "파일 업로드에 실패했습니다. Supabase Storage 버킷(applications)과 권한 설정을 확인해주세요.",
          details: detailedMessage,
          hint: getStorageTroubleshootingHint(detailedMessage),
        },
        { status: 500 }
      );
    }

    const { error: insertError } = await supabase.from("applicants").insert({
      name,
      student_id: studentId,
      email,
      phone,
      file_url: `private:applications/${filePath}`,
      file_name: file.name,
      generation,
      recruitment_cycle_id: activeCycle?.id ?? null,
      status: "pending",
    });

    if (insertError) {
      console.error("DB insert error:", insertError);
      await supabase.storage.from("applications").remove([filePath]);
      return NextResponse.json(
        { error: "지원자 DB 저장에 실패했습니다. 테이블 및 RLS 정책을 확인해주세요." },
        { status: 500 }
      );
    }

    try {
      const resend = getResendClient();
      const adminEmail = buildAdminEmail({ name, studentId, email, phone });

      const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) =>
        e.trim()
      ) || ["cni351237@naver.com"];

      await resend.emails.send({
        from: "금은동 시스템 <onboarding@resend.dev>",
        to: adminEmails,
        subject: adminEmail.subject,
        text: adminEmail.text + `\n\n지원서 파일은 관리자 대시보드에서 확인해주세요.`,
      });
    } catch (emailError) {
      console.error("Email send error:", emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Application submission error:", error);
    const detailedMessage = error instanceof Error ? error.message : "unknown error";

    if (detailedMessage.includes("Supabase server environment variables are not configured")) {
      return NextResponse.json(
        {
          error: "서버 환경변수 설정이 누락되어 파일 업로드를 진행할 수 없습니다.",
          details: detailedMessage,
          hint: "Vercel 환경변수에 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY를 추가 후 재배포해주세요.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "서버 오류가 발생했습니다. 다시 시도해주세요.",
        details: detailedMessage,
      },
      { status: 500 }
    );
  }
}
