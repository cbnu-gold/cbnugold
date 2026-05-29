import { NextRequest, NextResponse } from "next/server";
import { forbidden, verifyAdmin, writeAuditLog } from "@/lib/admin-auth";
import { canManageApplicants } from "@/lib/admin-permissions";
import { buildApplicantAuditMetadata } from "@/lib/applicant-audit";
import { readJsonObject } from "@/lib/request-json";
import { createServerClient } from "@/lib/supabase-server";
import type { Applicant } from "@/types";

const applicantStatuses = ["pending", "reviewed", "interview", "accepted", "rejected"] as const;

function extractStoragePath(fileUrl: string) {
  if (!fileUrl) return null;
  if (!fileUrl.startsWith("http")) return fileUrl.replace(/^private:applications\//, "");
  const marker = "/storage/v1/object/public/applications/";
  const index = fileUrl.indexOf(marker);
  return index >= 0 ? decodeURIComponent(fileUrl.slice(index + marker.length)) : null;
}

async function attachSignedUrl(applicant: Applicant) {
  const path = extractStoragePath(applicant.file_url);
  if (!path) return applicant;

  const supabase = createServerClient();
  const { data: signed } = await supabase.storage
    .from("applications")
    .createSignedUrl(path, 600);

  return { ...applicant, signed_url: signed?.signedUrl ?? null };
}

export async function GET(request: NextRequest) {
  const { admin, response } = await verifyAdmin(request, true);
  if (response) return response;
  if (!admin || !canManageApplicants(admin.profile.role)) {
    return forbidden("지원자 개인정보 조회 권한이 없습니다");
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("applicants")
    .select("*")
    .order("applied_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const applicants = await Promise.all(
    ((data ?? []) as Applicant[]).map((applicant) => attachSignedUrl(applicant))
  );

  return NextResponse.json({ applicants });
}

export async function PATCH(request: NextRequest) {
  const { admin, response } = await verifyAdmin(request);
  if (response) return response;
  if (!admin) return NextResponse.json({ error: "관리자 인증이 필요합니다" }, { status: 401 });
  if (!canManageApplicants(admin.profile.role)) {
    return forbidden("지원자 정보 수정 권한이 없습니다");
  }

  const bodyResult = await readJsonObject(request, "지원자 수정 요청 형식이 올바르지 않습니다");
  if (bodyResult.error) return NextResponse.json({ error: bodyResult.error }, { status: 400 });
  const { id, status, admin_note, review_score } = bodyResult.data ?? {};
  if (!id) return NextResponse.json({ error: "지원자 id가 필요합니다" }, { status: 400 });
  if (typeof id !== "string") {
    return NextResponse.json({ error: "지원자 id 형식이 올바르지 않습니다" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (status) {
    if (typeof status !== "string" || !applicantStatuses.includes(status as (typeof applicantStatuses)[number])) {
      return NextResponse.json({ error: "지원자 상태값이 올바르지 않습니다" }, { status: 400 });
    }
    update.status = status;
  }
  if (typeof admin_note === "string") update.admin_note = admin_note;
  if (review_score === null || typeof review_score === "number") {
    if (
      typeof review_score === "number" &&
      (!Number.isInteger(review_score) || review_score < 0 || review_score > 100)
    ) {
      return NextResponse.json({ error: "점수는 0~100 사이의 정수여야 합니다" }, { status: 400 });
    }
    update.review_score = review_score;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "수정할 값이 필요합니다" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("applicants")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await writeAuditLog(admin, "update_applicant", "applicants", id, buildApplicantAuditMetadata(update));
  return NextResponse.json({ applicant: await attachSignedUrl(data as Applicant) });
}
