import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, writeAuditLog, type VerifiedAdmin } from "@/lib/admin-auth";
import {
  canManageAdmins,
  canViewAudit,
  canWriteContent,
} from "@/lib/admin-permissions";
import { getCmsResourceMutationBlockMessage } from "@/lib/admin-cms-resources";
import {
  deletingWouldLeaveNoActiveOwner,
  patchRemovesActiveOwner,
  wouldLeaveNoActiveOwner,
  type AdminProfilePatch,
  type AdminSafetyProfile,
} from "@/lib/admin-safety";
import { getOptionalCmsHrefError, normalizeOptionalCmsHref } from "@/lib/cms-links";
import { validateAndNormalizeCmsResourcePayload } from "@/lib/cms-resource-validation";
import { validateAndNormalizeRecruitmentPayload } from "@/lib/recruitment-admin";
import { isRecord, readJsonObject } from "@/lib/request-json";
import { validateAndNormalizeSiteSettingsValue } from "@/lib/site-settings";
import { createServerClient } from "@/lib/supabase-server";
import type { AdminRole } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

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

function validatePayload(resource: Resource, payload: CmsPayload, mode: "insert" | "update") {
  if (resource === "settings" && "value" in payload) {
    const result = validateAndNormalizeSiteSettingsValue(payload.value);
    if (result.error) return result.error;
    payload.value = result.value;
  }

  const resourceError = validateAndNormalizeCmsResourcePayload(resource, payload, mode);
  if (resourceError) return resourceError;

  if (resource === "blocks") {
    const ctaError = getOptionalCmsHrefError(payload.cta_href, "블록 CTA 링크");
    if (ctaError) return ctaError;
    const mediaError = getOptionalCmsHrefError(payload.media_url, "블록 미디어 URL");
    if (mediaError) return mediaError;
    if ("cta_href" in payload) payload.cta_href = normalizeOptionalCmsHref(payload.cta_href);
    if ("media_url" in payload) payload.media_url = normalizeOptionalCmsHref(payload.media_url);
  }

  if (resource === "recruitment") {
    const recruitmentError = validateAndNormalizeRecruitmentPayload(payload);
    if (recruitmentError) return recruitmentError;

    const docxError = getOptionalCmsHrefError(payload.docx_url, "DOCX 지원서 URL");
    if (docxError) return docxError;
    const hwpError = getOptionalCmsHrefError(payload.hwp_url, "HWP 지원서 URL");
    if (hwpError) return hwpError;
    if ("docx_url" in payload) payload.docx_url = normalizeOptionalCmsHref(payload.docx_url);
    if ("hwp_url" in payload) payload.hwp_url = normalizeOptionalCmsHref(payload.hwp_url);
  }

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

  if (
    resource === "admins" &&
    "email" in payload &&
    typeof payload.email === "string" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)
  ) {
    return "관리자 이메일 형식이 올바르지 않습니다";
  }

  if (
    resource === "admins" &&
    "id" in payload &&
    typeof payload.id === "string" &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.id)
  ) {
    return "관리자 사용자 UUID 형식이 올바르지 않습니다";
  }

  return null;
}

async function getAdminProfile(
  supabase: SupabaseClient,
  id: string
): Promise<{ profile: AdminSafetyProfile | null; error: string | null }> {
  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id,role,is_active")
    .eq("id", id)
    .maybeSingle();

  if (error) return { profile: null, error: error.message };
  return { profile: data as AdminSafetyProfile | null, error: null };
}

async function getActiveOwnerCount(supabase: SupabaseClient) {
  const { count, error } = await supabase
    .from("admin_profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner")
    .eq("is_active", true);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function validateAdminProfileUpdate(
  supabase: SupabaseClient,
  admin: VerifiedAdmin,
  id: string,
  payload: CmsPayload
) {
  const { profile, error } = await getAdminProfile(supabase, id);
  if (error) return NextResponse.json({ error }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "관리자 계정을 찾을 수 없습니다" }, { status: 404 });

  const patch: AdminProfilePatch = {};
  if (typeof payload.role === "string" && adminRoles.has(payload.role)) {
    patch.role = payload.role as AdminRole;
  }
  if (typeof payload.is_active === "boolean") {
    patch.is_active = payload.is_active;
  }

  if (admin.id === id && patchRemovesActiveOwner(profile, patch)) {
    return NextResponse.json(
      { error: "본인의 소유자 권한은 직접 비활성화하거나 변경할 수 없습니다" },
      { status: 400 }
    );
  }

  if (patch.role || typeof patch.is_active === "boolean") {
    let activeOwnerCount = 0;
    try {
      activeOwnerCount = await getActiveOwnerCount(supabase);
    } catch {
      return NextResponse.json(
        { error: "소유자 계정 상태를 확인하지 못했습니다" },
        { status: 500 }
      );
    }
    if (wouldLeaveNoActiveOwner(profile, patch, activeOwnerCount)) {
      return NextResponse.json(
        { error: "활성 소유자 계정은 최소 1개 이상 유지해야 합니다" },
        { status: 400 }
      );
    }
  }

  return null;
}

async function validateAdminProfileDelete(
  supabase: SupabaseClient,
  admin: VerifiedAdmin,
  id: string
) {
  if (admin.id === id) {
    return NextResponse.json(
      { error: "현재 로그인한 관리자 계정은 직접 삭제할 수 없습니다" },
      { status: 400 }
    );
  }

  const { profile, error } = await getAdminProfile(supabase, id);
  if (error) return NextResponse.json({ error }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "관리자 계정을 찾을 수 없습니다" }, { status: 404 });

  let activeOwnerCount = 0;
  try {
    activeOwnerCount = await getActiveOwnerCount(supabase);
  } catch {
    return NextResponse.json(
      { error: "소유자 계정 상태를 확인하지 못했습니다" },
      { status: 500 }
    );
  }
  if (deletingWouldLeaveNoActiveOwner(profile, activeOwnerCount)) {
    return NextResponse.json(
      { error: "활성 소유자 계정은 최소 1개 이상 유지해야 합니다" },
      { status: 400 }
    );
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

  const { admin, response } = await verifyAdmin(request, true);
  if (response) return response;
  if (!admin) return NextResponse.json({ error: "관리자 인증이 필요합니다" }, { status: 401 });
  if (resource === "admins" && !canManageAdmins(admin.profile.role)) {
    return NextResponse.json({ error: "소유자 권한이 필요합니다" }, { status: 403 });
  }
  if (resource === "audit" && !canViewAudit(admin.profile.role)) {
    return NextResponse.json({ error: "감사 로그 조회 권한이 없습니다" }, { status: 403 });
  }

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
  if (resource === "admins" && !canManageAdmins(admin.profile.role)) {
    return NextResponse.json({ error: "소유자 권한이 필요합니다" }, { status: 403 });
  }
  if (resource !== "admins" && !canWriteContent(admin.profile.role)) {
    return NextResponse.json({ error: "콘텐츠 수정 권한이 없습니다" }, { status: 403 });
  }
  const mutationBlockMessage = getCmsResourceMutationBlockMessage(resource);
  if (mutationBlockMessage) return NextResponse.json({ error: mutationBlockMessage }, { status: 404 });

  const bodyResult = await readJsonObject(request, "CMS 생성 요청 형식이 올바르지 않습니다");
  if (bodyResult.error) return NextResponse.json({ error: bodyResult.error }, { status: 400 });
  const body = bodyResult.data ?? {};
  const payload = sanitizePayload(resource as Resource, body, admin.id, "insert");
  const validationError = validatePayload(resource as Resource, payload, "insert");
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  if (resource === "admins" && typeof payload.id !== "string") {
    return NextResponse.json({ error: "관리자 사용자 UUID가 필요합니다" }, { status: 400 });
  }

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
  if (resource === "admins" && !canManageAdmins(admin.profile.role)) {
    return NextResponse.json({ error: "소유자 권한이 필요합니다" }, { status: 403 });
  }
  if (resource !== "admins" && !canWriteContent(admin.profile.role)) {
    return NextResponse.json({ error: "콘텐츠 수정 권한이 없습니다" }, { status: 403 });
  }
  const mutationBlockMessage = getCmsResourceMutationBlockMessage(resource);
  if (mutationBlockMessage) return NextResponse.json({ error: mutationBlockMessage }, { status: 404 });

  const bodyResult = await readJsonObject(request, "CMS 수정 요청 형식이 올바르지 않습니다");
  if (bodyResult.error) return NextResponse.json({ error: bodyResult.error }, { status: 400 });
  const { id, key, values } = bodyResult.data ?? {};
  const targetId = typeof id === "string" ? id : null;
  const targetKey = typeof key === "string" ? key : null;
  if (!targetId && !targetKey) return NextResponse.json({ error: "id 또는 key가 필요합니다" }, { status: 400 });
  if (resource === "admins" && !targetId) {
    return NextResponse.json({ error: "관리자 수정에는 사용자 UUID가 필요합니다" }, { status: 400 });
  }
  if (!isRecord(values)) {
    return NextResponse.json({ error: "수정할 값이 필요합니다" }, { status: 400 });
  }

  const supabase = createServerClient();
  const payload = sanitizePayload(resource as Resource, values, admin.id, "update");
  const validationError = validatePayload(resource as Resource, payload, "update");
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  if (resource === "admins" && targetId) {
    const adminProfileError = await validateAdminProfileUpdate(supabase, admin, targetId, payload);
    if (adminProfileError) return adminProfileError;
  }

  let query = supabase.from(target.table).update(payload).select("*");
  query = targetKey ? query.eq("key", targetKey) : query.eq("id", targetId);
  const { data, error } = await query.single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await writeAuditLog(admin, "update", target.table, targetId ?? targetKey ?? undefined, {
    resource,
    values: Object.keys(values),
  });
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
  if (resource === "admins" && !canManageAdmins(admin.profile.role)) {
    return NextResponse.json({ error: "소유자 권한이 필요합니다" }, { status: 403 });
  }
  if (resource !== "admins" && !canWriteContent(admin.profile.role)) {
    return NextResponse.json({ error: "콘텐츠 삭제 권한이 없습니다" }, { status: 403 });
  }
  const mutationBlockMessage = getCmsResourceMutationBlockMessage(resource);
  if (mutationBlockMessage) return NextResponse.json({ error: mutationBlockMessage }, { status: 404 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id가 필요합니다" }, { status: 400 });

  const supabase = createServerClient();
  if (resource === "admins") {
    const adminProfileError = await validateAdminProfileDelete(supabase, admin, id);
    if (adminProfileError) return adminProfileError;
  }

  const { error } = await supabase.from(target.table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await writeAuditLog(admin, "delete", target.table, id, { resource });
  return NextResponse.json({ ok: true });
}
