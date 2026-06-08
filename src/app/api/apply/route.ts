import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import {
  buildAdminEmail,
  getAdminEmailRecipients,
  getResendClient,
  getResendFromEmail,
} from "@/lib/resend";
import {
  buildApplicationStoragePath,
  getApplicationFileExtension,
  getApplicationFileValidationError,
  normalizeApplicationFileName,
} from "@/lib/application-files";
import { validateAndNormalizeApplicationAnswers } from "@/lib/application-questions";
import { checkRateLimit } from "@/lib/rate-limit";
import { isRecruitmentOpen } from "@/lib/recruitment";
import { validationRules } from "@/lib/validations";
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

function publicError(message: string, status = 500, details?: string) {
  const body: Record<string, string> = { error: message };
  if (process.env.NODE_ENV !== "production" && details) {
    body.details = details;
    body.hint = getStorageTroubleshootingHint(details);
  }
  return NextResponse.json(body, { status });
}

const duplicateApplicantMessage =
  "이미 접수된 지원서가 있습니다. 접수 여부는 지원 확인 페이지에서 확인해주세요.";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const rateLimit = checkRateLimit(`apply:${ip}`, 5, 10 * 60 * 1000);

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: "짧은 시간 안에 제출 시도가 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "지원서 제출 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const name = String(formData.get("name") ?? "").trim();
    const studentId = String(formData.get("studentId") ?? "").replace(/\D/g, "");
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const phone = String(formData.get("phone") ?? "").replace(/\D/g, "");
    const applicationAnswersValue = String(formData.get("applicationAnswers") ?? "{}");
    const fileValue = formData.get("file");

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
    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: "파일을 첨부해주세요" }, { status: 400 });
    }

    const file = fileValue;
    const fileError = getApplicationFileValidationError(file.name, file.type, file.size);
    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
    }
    const ext = getApplicationFileExtension(file.name);
    if (!ext) return NextResponse.json({ error: "지원서 파일 형식이 올바르지 않습니다." }, { status: 400 });

    const supabase = createServerClient();

    const { data: cycleData } = await supabase
      .from("recruitment_cycles")
      .select("*")
      .eq("status", "published")
      .order("generation", { ascending: false })
      .limit(1)
      .maybeSingle();

    const activeCycle = cycleData as RecruitmentCycle | null;
    if (!activeCycle) {
      return NextResponse.json(
        { error: "모집 설정을 확인하는 중입니다. 운영진에게 문의해주세요." },
        { status: 503 }
      );
    }

    if (!isRecruitmentOpen(activeCycle)) {
      return NextResponse.json(
        { error: "현재 모집 접수 기간이 아닙니다." },
        { status: 403 }
      );
    }

    let rawApplicationAnswers: unknown;
    try {
      rawApplicationAnswers = JSON.parse(applicationAnswersValue);
    } catch {
      return NextResponse.json({ error: "추가 질문 답변 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const answerResult = validateAndNormalizeApplicationAnswers(
      activeCycle.application_questions ?? [],
      rawApplicationAnswers
    );
    if (answerResult.error || !answerResult.value) {
      return NextResponse.json(
        { error: answerResult.error ?? "추가 질문 답변을 확인해주세요." },
        { status: 400 }
      );
    }

    const generation = activeCycle?.generation ?? 9;
    const duplicateChecks = [
      supabase
        .from("applicants")
        .select("id")
        .is("recruitment_cycle_id", null)
        .eq("generation", generation)
        .eq("student_id", studentId)
        .limit(1),
    ];

    if (activeCycle.id) {
      duplicateChecks.push(
        supabase
          .from("applicants")
          .select("id")
          .eq("recruitment_cycle_id", activeCycle.id)
          .eq("student_id", studentId)
          .limit(1)
      );
    }

    const duplicateResults = await Promise.all(duplicateChecks);
    const duplicateCheckError = duplicateResults.find((result) => result.error)?.error;
    if (duplicateCheckError) {
      console.error("Duplicate applicant check error:", duplicateCheckError);
      return publicError(
        "지원서 접수 여부를 확인하지 못했습니다. 잠시 후 다시 시도하거나 운영진에게 문의해주세요.",
        500,
        duplicateCheckError.message
      );
    }

    if (duplicateResults.some((result) => result.data && result.data.length > 0)) {
      return NextResponse.json({ error: duplicateApplicantMessage }, { status: 409 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const filePath = buildApplicationStoragePath(generation, ext);

    const { error: uploadError } = await supabase.storage
      .from("applications")
      .upload(filePath, fileBuffer, {
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      const detailedMessage = uploadError.message || "unknown error";
      return publicError(
        "파일 업로드에 실패했습니다. 잠시 후 다시 시도하거나 운영진에게 문의해주세요.",
        500,
        detailedMessage
      );
    }

    const { error: insertError } = await supabase.from("applicants").insert({
      name,
      student_id: studentId,
      email,
      phone,
      file_url: `private:applications/${filePath}`,
      file_name: normalizeApplicationFileName(file.name),
      application_answers: answerResult.value,
      generation,
      recruitment_cycle_id: activeCycle?.id ?? null,
      status: "pending",
    });

    if (insertError) {
      console.error("DB insert error:", insertError);
      await supabase.storage.from("applications").remove([filePath]);
      if (insertError.code === "23505") {
        return NextResponse.json({ error: duplicateApplicantMessage }, { status: 409 });
      }
      return publicError(
        "지원서 저장에 실패했습니다. 잠시 후 다시 시도하거나 운영진에게 문의해주세요.",
        500,
        insertError.message
      );
    }

    try {
      const adminEmails = getAdminEmailRecipients();
      const fromEmail = getResendFromEmail();
      if (adminEmails.length > 0 && fromEmail) {
        const resend = getResendClient();
        const adminEmail = buildAdminEmail({ generation });

        await resend.emails.send({
          from: fromEmail,
          to: adminEmails,
          subject: adminEmail.subject,
          text: adminEmail.text + `\n\n지원서 파일은 관리자 대시보드에서 확인해주세요.`,
        });
      } else {
        console.warn("Admin application notification skipped: ADMIN_EMAILS or RESEND_FROM_EMAIL is not configured");
      }
    } catch (emailError) {
      console.error("Email send error:", emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Application submission error:", error);
    const detailedMessage = error instanceof Error ? error.message : "unknown error";

    if (detailedMessage.includes("Supabase server environment variables are not configured")) {
      return publicError(
        "지원 접수 시스템 설정을 확인하는 중입니다. 운영진에게 문의해주세요.",
        500,
        detailedMessage
      );
    }

    return publicError("서버 오류가 발생했습니다. 다시 시도해주세요.", 500, detailedMessage);
  }
}
