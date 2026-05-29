import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, writeAuditLog } from "@/lib/admin-auth";
import { createServerClient } from "@/lib/supabase-server";

const resourceMap = {
  settings: { table: "site_settings", order: "key", trackUpdatedBy: true },
  pages: { table: "content_pages", order: "sort_order", trackUpdatedBy: true },
  blocks: { table: "content_blocks", order: "sort_order", trackUpdatedBy: true },
  recruitment: { table: "recruitment_cycles", order: "generation", trackUpdatedBy: true },
  activities: { table: "activity_items", order: "sort_order", trackUpdatedBy: true },
  achievements: { table: "achievement_items", order: "sort_order", trackUpdatedBy: true },
  history: { table: "history_entries", order: "year", trackUpdatedBy: true },
  faqs: { table: "faq_items", order: "sort_order", trackUpdatedBy: true },
  media: { table: "media_assets", order: "created_at", trackUpdatedBy: true },
  admins: { table: "admin_profiles", order: "email", trackUpdatedBy: false },
  audit: { table: "audit_logs", order: "created_at", trackUpdatedBy: false },
} as const;

type Resource = keyof typeof resourceMap;
type CmsPayload = Record<string, unknown>;

const contentStatuses = new Set(["draft", "published", "archived"]);
const adminRoles = new Set(["owner", "admin", "editor", "viewer"]);
const achievementKinds = new Set(["placement", "award", "metric"]);
const readOnlyFields = new Set(["created_at", "updated_at", "signed_url", "__isNew"]);

function getResource(resource: string) {
  return resourceMap[resource as Resource] ?? null;
}

function ownerOnly(resource: string, role?: string) {
  return resource === "admins" && role !== "owner";
}

function sanitizePayload(
  resource: Resource,
  values: CmsPayload,
  adminId: string,
  mode: "insert" | "update"
) {
  const target = resourceMap[resource];
  const payload = Object.fromEntries(
    Object.entries(values).filter(([key, value]) => {
      if (value === undefined) return false;
      if (mode === "update" && key === "id") return false;
      return !readOnlyFields.has(key);
    })
  );

  if (target.trackUpdatedBy) payload.updated_by = adminId;
  return payload;
}

function validatePayload(resource: Resource, payload: CmsPayload) {
  if (
    "status" in payload &&
    typeof payload.status === "string" &&
    !contentStatuses.has(payload.status)
  ) {
    return "상태값은 draft, published, archived 중 하나여야 합니다";
  }

  if (
    resource === "pages" &&
    "slug" in payload &&
    typeof payload.slug === "string" &&
    !/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(payload.slug)
  ) {
    return "페이지 슬러그는 영문 소문자, 숫자, 하이픈, 슬래시만 사용할 수 있습니다";
  }

  if (
    resource === "achievements" &&
    "kind" in payload &&
    typeof payload.kind === "string" &&
    !achievementKinds.has(payload.kind)
  ) {
    return "성과 분류값이 올바르지 않습니다";
  }

  if (
    resource === "admins" &&
    "role" in payload &&
    typeof payload.role === "string" &&
    !adminRoles.has(payload.role)
  ) {
    return "관리자 권한값이 올바르지 않습니다";
  }

  return null;
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
  const payload = sanitizePayload(resource as Resource, body, admin.id, "insert");
  const validationError = validatePayload(resource as Resource, payload);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from(target.table)
    .insert(payload)
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
  const payload = sanitizePayload(resource as Resource, values ?? {}, admin.id, "update");
  const validationError = validatePayload(resource as Resource, payload);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

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
