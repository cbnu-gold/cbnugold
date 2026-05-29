import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, writeAuditLog } from "@/lib/admin-auth";
import { createServerClient } from "@/lib/supabase-server";
import type { Applicant } from "@/types";

function extractStoragePath(fileUrl: string) {
  if (!fileUrl) return null;
  if (!fileUrl.startsWith("http")) return fileUrl.replace(/^private:applications\//, "");
  const marker = "/storage/v1/object/public/applications/";
  const index = fileUrl.indexOf(marker);
  return index >= 0 ? decodeURIComponent(fileUrl.slice(index + marker.length)) : null;
}

export async function GET(request: NextRequest) {
  const { response } = await verifyAdmin(request, true);
  if (response) return response;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("applicants")
    .select("*")
    .order("applied_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const applicants = await Promise.all(
    ((data ?? []) as Applicant[]).map(async (applicant) => {
      const path = extractStoragePath(applicant.file_url);
      if (!path) return applicant;

      const { data: signed } = await supabase.storage
        .from("applications")
        .createSignedUrl(path, 600);

      return { ...applicant, signed_url: signed?.signedUrl ?? null };
    })
  );

  return NextResponse.json({ applicants });
}

export async function PATCH(request: NextRequest) {
  const { admin, response } = await verifyAdmin(request);
  if (response) return response;
  if (!admin) return NextResponse.json({ error: "관리자 인증이 필요합니다" }, { status: 401 });

  const { id, status, admin_note, review_score } = await request.json();
  if (!id) return NextResponse.json({ error: "지원자 id가 필요합니다" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (status) update.status = status;
  if (typeof admin_note === "string") update.admin_note = admin_note;
  if (review_score === null || typeof review_score === "number") {
    update.review_score = review_score;
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("applicants")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await writeAuditLog(admin, "update_applicant", "applicants", id, update);
  return NextResponse.json({ applicant: data });
}
