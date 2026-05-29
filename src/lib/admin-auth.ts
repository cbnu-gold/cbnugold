import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import type { AdminProfile } from "@/types";

export interface VerifiedAdmin {
  id: string;
  email: string;
  profile: AdminProfile;
  token: string;
}

export function unauthorized(message = "관리자 인증이 필요합니다") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "관리자 권한이 없습니다") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim();
}

export async function verifyAdmin(
  request: NextRequest,
  allowViewer = false
): Promise<{ admin: VerifiedAdmin | null; response: NextResponse | null }> {
  const token = getBearerToken(request);
  if (!token) return { admin: null, response: unauthorized() };

  const supabase = createServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData.user;

  if (userError || !user?.email) {
    return { admin: null, response: unauthorized() };
  }

  const { data: profile, error: profileError } = await supabase
    .from("admin_profiles")
    .select("id,email,name,role,is_active")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (profileError) {
    return {
      admin: null,
      response: NextResponse.json(
        { error: "관리자 권한 확인 중 오류가 발생했습니다" },
        { status: 500 }
      ),
    };
  }

  const adminProfile = profile as AdminProfile | null;
  if (!adminProfile) return { admin: null, response: forbidden() };
  if (!allowViewer && adminProfile.role === "viewer") {
    return { admin: null, response: forbidden("수정 권한이 없습니다") };
  }

  return {
    admin: {
      id: user.id,
      email: user.email,
      profile: adminProfile,
      token,
    },
    response: null,
  };
}

export async function writeAuditLog(
  admin: VerifiedAdmin,
  action: string,
  targetTable?: string,
  targetId?: string,
  metadata: Record<string, unknown> = {}
) {
  const supabase = createServerClient();
  await supabase.from("audit_logs").insert({
    actor_id: admin.id,
    actor_email: admin.email,
    action,
    target_table: targetTable ?? null,
    target_id: targetId ?? null,
    metadata,
  });
}
