import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { escapeCsvValue, toCsv } from "../src/lib/csv";
import { checkRateLimit } from "../src/lib/rate-limit";
import { getRecruitmentPhase, isRecruitmentOpen } from "../src/lib/recruitment";
import {
  canManageAdmins,
  canManageApplicants,
  canViewAudit,
  canWriteContent,
} from "../src/lib/admin-permissions";
import {
  deletingWouldLeaveNoActiveOwner,
  patchRemovesActiveOwner,
  wouldLeaveNoActiveOwner,
} from "../src/lib/admin-safety";
import {
  getOptionalCmsHrefError,
  isSafeCmsHref,
  normalizeOptionalCmsHref,
} from "../src/lib/cms-links";
import { validateAndNormalizeCmsResourcePayload } from "../src/lib/cms-resource-validation";
import { getHealthStatus, sanitizeHealthError } from "../src/lib/health";
import { validateAndNormalizeRecruitmentPayload } from "../src/lib/recruitment-admin";
import { validateAndNormalizeSiteSettingsValue } from "../src/lib/site-settings";
import type { RecruitmentCycle } from "../src/types";

const baseCycle: RecruitmentCycle = {
  generation: 9,
  title: "금은동 9기 모집",
  is_open: true,
  start_at: "2026-02-19T00:00:00+09:00",
  end_at: "2026-03-01T18:00:00+09:00",
  document_result_at: null,
  interview_at: null,
  final_result_at: null,
  meeting_time: null,
  requirements: [],
  fee_note: null,
  docx_url: null,
  hwp_url: null,
  privacy_retention: "6개월",
  status: "published",
};

const baseSettings = {
  site_title: "금은동",
  club_name: "충북대학교 금융권 취업 동아리 금은동",
  hero_title: "충북대 금융권 취업 동아리 금은동",
  hero_subtitle: "신문 스크랩, 리포트 분석, 현직자 네트워킹을 진행합니다.",
  primary_cta_label: "지원 안내 보기",
  primary_cta_href: "/join",
  secondary_cta_label: "활동 둘러보기",
  secondary_cta_href: "/activity",
  contact_name: "6대 회장 이승현",
  contact_phone: "010-2623-2004",
  contact_email: "cni351237@naver.com",
  instagram_url: "https://www.instagram.com/cbnu_gold/",
  naver_cafe_url: "https://cafe.naver.com/cufaclub",
};

test("CSV values are escaped for commas, quotes, and new lines", () => {
  assert.equal(escapeCsvValue('홍길동,"메모"'), '"홍길동,""메모"""');
  assert.equal(toCsv(["이름", "메모"], [["홍길동", "1차\n확인"]]), '이름,메모\n홍길동,"1차\n확인"');
});

test("recruitment is open only when published, enabled, and before deadline", () => {
  assert.equal(isRecruitmentOpen(baseCycle, new Date("2026-02-25T00:00:00+09:00")), true);
  assert.equal(isRecruitmentOpen(baseCycle, new Date("2026-03-02T00:00:00+09:00")), false);
  assert.equal(isRecruitmentOpen({ ...baseCycle, is_open: false }, new Date("2026-02-25T00:00:00+09:00")), false);
  assert.equal(isRecruitmentOpen({ ...baseCycle, status: "draft" }, new Date("2026-02-25T00:00:00+09:00")), false);
});

test("recruitment phase distinguishes scheduled, closed, paused, and open states", () => {
  assert.equal(getRecruitmentPhase(baseCycle, new Date("2026-02-18T00:00:00+09:00")), "scheduled");
  assert.equal(getRecruitmentPhase(baseCycle, new Date("2026-02-25T00:00:00+09:00")), "open");
  assert.equal(getRecruitmentPhase(baseCycle, new Date("2026-03-02T00:00:00+09:00")), "closed");
  assert.equal(getRecruitmentPhase({ ...baseCycle, end_at: null, is_open: false }, new Date("2026-02-25T00:00:00+09:00")), "paused");
});

test("rate limit blocks requests after the configured limit", () => {
  const key = `test:${Date.now()}:${Math.random()}`;
  assert.equal(checkRateLimit(key, 2, 60_000).ok, true);
  assert.equal(checkRateLimit(key, 2, 60_000).ok, true);
  assert.equal(checkRateLimit(key, 2, 60_000).ok, false);
});

test("admin owner safety prevents removing the last active owner", () => {
  const owner = { id: "owner-id", role: "owner" as const, is_active: true };
  const editor = { id: "editor-id", role: "editor" as const, is_active: true };

  assert.equal(patchRemovesActiveOwner(owner, { role: "admin" }), true);
  assert.equal(patchRemovesActiveOwner(owner, { is_active: false }), true);
  assert.equal(patchRemovesActiveOwner(editor, { is_active: false }), false);
  assert.equal(wouldLeaveNoActiveOwner(owner, { role: "admin" }, 1), true);
  assert.equal(wouldLeaveNoActiveOwner(owner, { role: "admin" }, 2), false);
  assert.equal(deletingWouldLeaveNoActiveOwner(owner, 1), true);
  assert.equal(deletingWouldLeaveNoActiveOwner(owner, 2), false);
});

test("admin roles separate content editing from sensitive applicant data", () => {
  assert.equal(canWriteContent("owner"), true);
  assert.equal(canWriteContent("admin"), true);
  assert.equal(canWriteContent("editor"), true);
  assert.equal(canWriteContent("viewer"), false);

  assert.equal(canManageApplicants("owner"), true);
  assert.equal(canManageApplicants("admin"), true);
  assert.equal(canManageApplicants("editor"), false);
  assert.equal(canManageApplicants("viewer"), false);

  assert.equal(canManageAdmins("owner"), true);
  assert.equal(canManageAdmins("admin"), false);
  assert.equal(canViewAudit("admin"), true);
  assert.equal(canViewAudit("editor"), false);
});

test("Supabase RLS policies match sensitive admin role boundaries", () => {
  const schema = readFileSync(new URL("../supabase-schema.sql", import.meta.url), "utf8");

  assert.match(
    schema,
    /CREATE POLICY "Admins can view applicants"[\s\S]*USING \(public\.can_manage_applicants\(\)\);/
  );
  assert.match(
    schema,
    /CREATE POLICY "Admins can update applicants"[\s\S]*USING \(public\.can_manage_applicants\(\)\)[\s\S]*WITH CHECK \(public\.can_manage_applicants\(\)\);/
  );
  assert.match(
    schema,
    /CREATE POLICY "Admins can read audit logs"[\s\S]*USING \(public\.can_view_audit_logs\(\)\);/
  );
  assert.match(
    schema,
    /CREATE POLICY "Admins can read admin profiles"[\s\S]*USING \(public\.can_read_admin_profiles\(\)\);/
  );

  const createPolicyNames = [...schema.matchAll(/CREATE POLICY "([^"]+)"/g)].map((match) => match[1]);
  const dropPolicyNames = new Set([...schema.matchAll(/DROP POLICY IF EXISTS "([^"]+)"/g)].map((match) => match[1]));

  for (const policyName of createPolicyNames) {
    assert.equal(dropPolicyNames.has(policyName), true, `${policyName} must be dropped before re-create`);
  }
});

test("health status reports degraded when any check fails", () => {
  assert.equal(getHealthStatus([{ name: "env", ok: true }]), "ok");
  assert.equal(
    getHealthStatus([
      { name: "env", ok: true },
      { name: "db", ok: false },
    ]),
    "degraded"
  );
  assert.equal(
    sanitizeHealthError(new Error("TypeError: fetch failed")),
    "Supabase에 연결할 수 없습니다"
  );
});

test("site settings validation normalizes safe values", () => {
  const result = validateAndNormalizeSiteSettingsValue({
    ...baseSettings,
    hero_title: "  충북대 금융권 취업 동아리 금은동  ",
    instagram_url: "",
  });

  assert.equal(result.error, null);
  assert.equal(result.value?.hero_title, "충북대 금융권 취업 동아리 금은동");
  assert.equal(result.value?.instagram_url, "");
});

test("site settings validation rejects unsafe public links", () => {
  assert.equal(
    validateAndNormalizeSiteSettingsValue({
      ...baseSettings,
      primary_cta_href: "javascript:alert(1)",
    }).error,
    "주요 CTA 링크는 사이트 내부 경로 또는 https URL만 사용할 수 있습니다"
  );

  assert.equal(
    validateAndNormalizeSiteSettingsValue({
      ...baseSettings,
      instagram_url: "http://example.com",
    }).error,
    "인스타그램 URL은 https URL만 사용할 수 있습니다"
  );
});

test("CMS href validation allows internal paths and https URLs only", () => {
  assert.equal(isSafeCmsHref("/join/check"), true);
  assert.equal(isSafeCmsHref("https://forms.gle/example"), true);
  assert.equal(isSafeCmsHref("http://example.com"), false);
  assert.equal(isSafeCmsHref("//example.com"), false);
  assert.equal(isSafeCmsHref("javascript:alert(1)"), false);
  assert.equal(normalizeOptionalCmsHref("  /join  "), "/join");
  assert.equal(normalizeOptionalCmsHref("http://example.com"), null);
  assert.equal(
    getOptionalCmsHrefError("javascript:alert(1)", "CTA 링크"),
    "CTA 링크는 사이트 내부 경로 또는 https URL만 사용할 수 있습니다"
  );
});

test("recruitment admin validation normalizes editable public fields", () => {
  const payload: Record<string, unknown> = {
    generation: "10",
    title: "  금은동 10기 모집  ",
    is_open: false,
    start_at: "2026-02-01T00:00:00.000Z",
    end_at: "2026-02-10T09:00:00.000Z",
    document_result_at: "",
    interview_at: null,
    final_result_at: null,
    meeting_time: "  매주 화요일 19:00 정기모임  ",
    fee_note: "",
    privacy_retention: "지원 결과 발표일로부터 6개월 후 파기",
    requirements: [" 충북대학교 재학생 ", ""],
  };

  assert.equal(validateAndNormalizeRecruitmentPayload(payload), null);
  assert.equal(payload.generation, 10);
  assert.equal(payload.title, "금은동 10기 모집");
  assert.equal(payload.document_result_at, null);
  assert.deepEqual(payload.requirements, ["충북대학교 재학생"]);
  assert.equal(payload.meeting_time, "매주 화요일 19:00 정기모임");
  assert.equal(payload.fee_note, null);
});

test("recruitment admin validation rejects invalid schedule order", () => {
  const payload = {
    start_at: "2026-02-10T00:00:00.000Z",
    end_at: "2026-02-01T00:00:00.000Z",
  };

  assert.equal(
    validateAndNormalizeRecruitmentPayload(payload),
    "모집 마감 일시는 모집 시작 이후여야 합니다"
  );
});

test("CMS resource validation normalizes repeated content records", () => {
  const activity: Record<string, unknown> = {
    title: "  신문 스크랩  ",
    subtitle: "",
    description: "  금융시장 뉴스를 정리합니다.  ",
    category: "regular",
    tags: [" 뉴스 ", "", "리서치"],
    sort_order: "2",
  };

  assert.equal(validateAndNormalizeCmsResourcePayload("activities", activity, "insert"), null);
  assert.equal(activity.title, "신문 스크랩");
  assert.equal(activity.subtitle, null);
  assert.deepEqual(activity.tags, ["뉴스", "리서치"]);
  assert.equal(activity.sort_order, 2);
});

test("CMS resource validation rejects malformed repeated content", () => {
  assert.equal(
    validateAndNormalizeCmsResourcePayload(
      "faqs",
      { question: "", answer: "답변", sort_order: 1 },
      "insert"
    ),
    "FAQ 질문 값이 필요합니다"
  );
  assert.equal(
    validateAndNormalizeCmsResourcePayload(
      "blocks",
      { page_slug: "home", block_key: "Hero Key", sort_order: 1 },
      "insert"
    ),
    "블록 키는 영문 소문자, 숫자, 하이픈, 밑줄만 사용할 수 있습니다"
  );
});
