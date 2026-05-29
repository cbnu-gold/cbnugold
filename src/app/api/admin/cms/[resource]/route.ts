import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, writeAuditLog } from "@/lib/admin-auth";
import { createServerClient } from "@/lib/supabase-server";

const resourceMap = {
  settings: { table: "site_settings", order: "key" },
  blocks: { table: "content_blocks", order: "sort_order" },
  recruitment: { table: "recruitment_cycles", order: "generation" },
  activities: { table: "activity_items", order: "sort_order" },
  achievements: { table: "achievement_items", order: "sort_order" },
  history: { table: "history_entries", order: "year" },
  faqs: { table: "faq_items", order: "sort_order" },
  media: { table: "media_assets", order: "created_at" },
  admins: { table: "admin_profiles", order: "email" },
  audit: { table: "audit_logs", order: "created_at" },
} as const;

type Resource = keyof typeof resourceMap;

function getResource(resource: string) {
  return resourceMap[resource as Resource] ?? null;
}

function ownerOnly(resource: string, role?: string) {
  return resource === "admins" && role !== "owner";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ resource: string }> }
) {
  const { resource } = await context.params;
  const target = getResource(resource);
  if (!target) return NextResponse.json({ error: "지원하지 않는 CMS 리소스입니다" }, { status: 404 });

  const { response } = await verifyAdmin(request, true);
  if (response) return response;

  const supabase = createServerClient();
  let query = supabase.from(target.table).select("*");
  query = query.order(target.order, { ascending: target.order !== "created_at" });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ resource: string }> }
) {
  const { resource } = await context.params;
  const target = getResource(resource);
  if (!target || resource === "audit") {
    return NextResponse.json({ error: "생성할 수 없는 리소스입니다" }, { status: 404 });
  }

  const { admin, response } = await verifyAdmin(request);
  if (response) return response;
  if (!admin) return NextResponse.json({ error: "관리자 인증이 필요합니다" }, { status: 401 });
  if (ownerOnly(resource, admin.profile.role)) {
    return NextResponse.json({ error: "소유자 권한이 필요합니다" }, { status: 403 });
  }

  const body = await request.json();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from(target.table)
    .insert({ ...body, updated_by: admin.id })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await writeAuditLog(admin, "create", target.table, data?.id ?? body.key, { resource });
  return NextResponse.json({ item: data });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ resource: string }> }
) {
  const { resource } = await context.params;
  const target = getResource(resource);
  if (!target || resource === "audit") {
    return NextResponse.json({ error: "수정할 수 없는 리소스입니다" }, { status: 404 });
  }

  const { admin, response } = await verifyAdmin(request);
  if (response) return response;
  if (!admin) return NextResponse.json({ error: "관리자 인증이 필요합니다" }, { status: 401 });
  if (ownerOnly(resource, admin.profile.role)) {
    return NextResponse.json({ error: "소유자 권한이 필요합니다" }, { status: 403 });
  }

  const { id, key, values } = await request.json();
  if (!id && !key) return NextResponse.json({ error: "id 또는 key가 필요합니다" }, { status: 400 });

  const supabase = createServerClient();
  const payload = { ...values, updated_by: admin.id };
  let query = supabase.from(target.table).update(payload).select("*");
  query = key ? query.eq("key", key) : query.eq("id", id);
  const { data, error } = await query.single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await writeAuditLog(admin, "update", target.table, id ?? key, { resource, values: Object.keys(values ?? {}) });
  return NextResponse.json({ item: data });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ resource: string }> }
) {
  const { resource } = await context.params;
  const target = getResource(resource);
  if (!target || resource === "settings" || resource === "audit") {
    return NextResponse.json({ error: "삭제할 수 없는 리소스입니다" }, { status: 404 });
  }

  const { admin, response } = await verifyAdmin(request);
  if (response) return response;
  if (!admin) return NextResponse.json({ error: "관리자 인증이 필요합니다" }, { status: 401 });
  if (ownerOnly(resource, admin.profile.role)) {
    return NextResponse.json({ error: "소유자 권한이 필요합니다" }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id가 필요합니다" }, { status: 400 });

  const supabase = createServerClient();
  const { error } = await supabase.from(target.table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await writeAuditLog(admin, "delete", target.table, id, { resource });
  return NextResponse.json({ ok: true });
}
