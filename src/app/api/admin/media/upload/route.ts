import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, writeAuditLog } from "@/lib/admin-auth";
import { createServerClient } from "@/lib/supabase-server";

const allowedTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
]);

const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".pdf"]);
const maxFileSize = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const { admin, response } = await verifyAdmin(request);
  if (response) return response;
  if (!admin) return NextResponse.json({ error: "관리자 인증이 필요합니다" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const alt = String(formData.get("alt") ?? "").trim().slice(0, 160);

  if (!file) return NextResponse.json({ error: "파일이 필요합니다" }, { status: 400 });
  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({ error: "PNG, JPG, WebP 이미지 또는 PDF만 업로드할 수 있습니다" }, { status: 400 });
  }
  if (file.size > maxFileSize) {
    return NextResponse.json({ error: "파일 크기는 10MB 이하여야 합니다" }, { status: 400 });
  }

  const safeName = file.name.replace(/[^\w.-]+/g, "-").toLowerCase();
  const extension = safeName.includes(".") ? safeName.slice(safeName.lastIndexOf(".")) : "";
  if (!allowedExtensions.has(extension)) {
    return NextResponse.json({ error: "파일 확장자는 png, jpg, jpeg, webp, pdf만 허용됩니다" }, { status: 400 });
  }

  const path = `${Date.now()}-${safeName}`;
  const supabase = createServerClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("cms-media")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("cms-media").getPublicUrl(path);
  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      bucket: "cms-media",
      path,
      public_url: urlData.publicUrl,
      alt,
      kind: file.type === "application/pdf" ? "document" : "image",
      status: "published",
      updated_by: admin.id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(admin, "upload_media", "media_assets", data.id, { path });
  return NextResponse.json({ item: data });
}
