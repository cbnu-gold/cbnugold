import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, writeAuditLog } from "@/lib/admin-auth";
import { cmsMediaBucket } from "@/lib/admin-media";
import {
  getCmsMediaFileExtension,
  getCmsMediaKind,
  getCmsMediaUploadValidationError,
} from "@/lib/cms-media-files";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const { admin, response } = await verifyAdmin(request);
  if (response) return response;
  if (!admin) return NextResponse.json({ error: "관리자 인증이 필요합니다" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "미디어 업로드 요청 형식이 올바르지 않습니다" }, { status: 400 });
  }
  const file = formData.get("file") as File | null;
  const alt = String(formData.get("alt") ?? "").trim().slice(0, 160);

  if (!file) return NextResponse.json({ error: "파일이 필요합니다" }, { status: 400 });
  const safeName = file.name.replace(/[^\w.-]+/g, "-").toLowerCase();
  const validationError = getCmsMediaUploadValidationError(safeName, file.type, file.size);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const extension = getCmsMediaFileExtension(safeName);
  const path = `${Date.now()}-${safeName}`;
  const supabase = createServerClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(cmsMediaBucket)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(cmsMediaBucket).getPublicUrl(path);
  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      bucket: cmsMediaBucket,
      path,
      public_url: urlData.publicUrl,
      alt,
      kind: getCmsMediaKind(extension),
      status: "published",
      updated_by: admin.id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(admin, "upload_media", "media_assets", data.id, { path });
  return NextResponse.json({ item: data });
}
