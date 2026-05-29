import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, writeAuditLog } from "@/lib/admin-auth";
import { cmsMediaBucket, isCmsMediaBucket } from "@/lib/admin-media";
import { readJsonObject } from "@/lib/request-json";
import { createServerClient } from "@/lib/supabase-server";

const contentStatuses = new Set(["draft", "published", "archived"]);
const mediaKinds = new Set(["image", "document"]);

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { admin, response } = await verifyAdmin(request);
  if (response) return response;
  if (!admin) return NextResponse.json({ error: "관리자 인증이 필요합니다" }, { status: 401 });

  const bodyResult = await readJsonObject(request, "미디어 수정 요청 형식이 올바르지 않습니다");
  if (bodyResult.error) return NextResponse.json({ error: bodyResult.error }, { status: 400 });
  const { alt, status, kind } = bodyResult.data ?? {};
  const update: Record<string, unknown> = { updated_by: admin.id };

  if (typeof alt === "string") update.alt = alt.trim().slice(0, 160);
  if (typeof status === "string") {
    if (!contentStatuses.has(status)) {
      return NextResponse.json({ error: "상태값이 올바르지 않습니다" }, { status: 400 });
    }
    update.status = status;
  }
  if (typeof kind === "string") {
    if (!mediaKinds.has(kind)) {
      return NextResponse.json({ error: "미디어 분류값이 올바르지 않습니다" }, { status: 400 });
    }
    update.kind = kind;
  }
  const changedFields = Object.keys(update).filter((field) => field !== "updated_by");
  if (changedFields.length === 0) {
    return NextResponse.json({ error: "수정할 값이 필요합니다" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("media_assets")
    .update(update)
    .eq("id", id)
    .eq("bucket", cmsMediaBucket)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await writeAuditLog(admin, "update_media", "media_assets", id, {
    fields: changedFields,
  });
  return NextResponse.json({ item: data });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { admin, response } = await verifyAdmin(request);
  if (response) return response;
  if (!admin) return NextResponse.json({ error: "관리자 인증이 필요합니다" }, { status: 401 });

  const supabase = createServerClient();
  const { data: asset, error: readError } = await supabase
    .from("media_assets")
    .select("id,bucket,path")
    .eq("id", id)
    .single();

  if (readError) return NextResponse.json({ error: readError.message }, { status: 404 });
  if (!isCmsMediaBucket(asset.bucket)) {
    return NextResponse.json({ error: "CMS 미디어 버킷의 파일만 삭제할 수 있습니다" }, { status: 400 });
  }

  const { error: storageError } = await supabase.storage
    .from(cmsMediaBucket)
    .remove([asset.path]);

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const { error: deleteError } = await supabase.from("media_assets").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

  await writeAuditLog(admin, "delete_media", "media_assets", id, {
    bucket: asset.bucket,
    path: asset.path,
  });
  return NextResponse.json({ ok: true });
}
