import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getCmsResourceMutationBlockMessage } from "../src/lib/admin-cms-resources";
import { cmsMediaBucket, isCmsMediaBucket } from "../src/lib/admin-media";
import {
  buildApplicationStoragePath,
  getApplicationFileExtension,
  getApplicationFileValidationError,
  normalizeApplicationFileName,
} from "../src/lib/application-files";
import { buildApplicantCheckScopes } from "../src/lib/application-check";
import { escapeCsvValue, toCsv } from "../src/lib/csv";
import {
  buildAdminEmail,
  getAdminEmailRecipients,
  getResendFromEmail,
} from "../src/lib/resend";
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
import { buildApplicantAuditMetadata } from "../src/lib/applicant-audit";
import {
  getOptionalCmsHrefError,
  isSafeCmsHref,
  normalizeOptionalCmsHref,
} from "../src/lib/cms-links";
import {
  getCmsMediaKind,
  getCmsMediaUploadValidationError,
} from "../src/lib/cms-media-files";
import { validateAndNormalizeCmsResourcePayload } from "../src/lib/cms-resource-validation";
import { getHealthStatus, sanitizeHealthError } from "../src/lib/health";
import { validateAndNormalizeRecruitmentPayload } from "../src/lib/recruitment-admin";
import { isRecord, readJsonObject } from "../src/lib/request-json";
import { validateAndNormalizeSiteSettingsValue } from "../src/lib/site-settings";
import { fallbackBlocks } from "../src/lib/cms-fallback";
import { defaultSeoDescription, recruitingShareImage, siteUrl } from "../src/lib/seo";
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

test("applicant audit metadata excludes memo and score contents", () => {
  const metadata = buildApplicantAuditMetadata({
    status: "interview",
    admin_note: "면접 평가와 개인정보",
    review_score: 92,
  });

  assert.deepEqual(metadata, {
    changed_fields: ["admin_note", "review_score", "status"],
    status: "interview",
  });
  assert.equal(JSON.stringify(metadata).includes("면접 평가"), false);
  assert.equal(JSON.stringify(metadata).includes("92"), false);
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

test("applicant schema prevents duplicate submissions per recruitment scope", () => {
  const schema = readFileSync(new URL("../supabase-schema.sql", import.meta.url), "utf8");

  assert.match(
    schema,
    /CREATE UNIQUE INDEX IF NOT EXISTS uniq_applicants_cycle_student_id[\s\S]*ON applicants\(recruitment_cycle_id, student_id\)[\s\S]*WHERE recruitment_cycle_id IS NOT NULL;/
  );
  assert.match(
    schema,
    /CREATE UNIQUE INDEX IF NOT EXISTS uniq_applicants_generation_student_id_without_cycle[\s\S]*ON applicants\(generation, student_id\)[\s\S]*WHERE recruitment_cycle_id IS NULL;/
  );
});

test("applicant check scopes stay within the active recruitment generation", () => {
  assert.deepEqual(buildApplicantCheckScopes(null), []);
  assert.deepEqual(buildApplicantCheckScopes({ generation: 9 }), [
    { kind: "legacy", recruitmentCycleId: null, generation: 9 },
  ]);
  assert.deepEqual(buildApplicantCheckScopes({ id: "cycle-9", generation: 9 }), [
    { kind: "cycle", recruitmentCycleId: "cycle-9", generation: 9 },
    { kind: "legacy", recruitmentCycleId: null, generation: 9 },
  ]);
});

test("fallback home content includes editable visual and philosophy blocks", () => {
  const schema = readFileSync(new URL("../supabase-schema.sql", import.meta.url), "utf8");
  const hero = fallbackBlocks.find((block) => block.page_slug === "home" && block.block_key === "hero");
  const philosophy = fallbackBlocks.find((block) => block.page_slug === "home" && block.block_key === "philosophy");
  const firstSemester = fallbackBlocks.find(
    (block) => block.page_slug === "join" && block.block_key === "first-semester"
  );

  assert.equal(hero?.media_url, "/images/gold-recruiting-board.png");
  assert.match(philosophy?.body ?? "", /읽고 정리합니다/);
  assert.match(philosophy?.body ?? "", /말하고 검증합니다/);
  assert.match(philosophy?.body ?? "", /연결하고 준비합니다/);
  assert.match(firstSemester?.title ?? "", /첫 학기 흐름/);
  assert.match(firstSemester?.body ?? "", /신문 스크랩/);
  assert.match(schema, /'join', 'first-semester'/);
});

test("SEO metadata uses the recruiting visual and Korean description", () => {
  const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  const home = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
  const robots = readFileSync(new URL("../src/app/robots.ts", import.meta.url), "utf8");
  const sitemap = readFileSync(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");

  assert.ok(siteUrl.length > 0);
  assert.doesNotMatch(siteUrl, /\/$/);
  assert.equal(recruitingShareImage.url, "/images/gold-recruiting-board.png");
  assert.equal(recruitingShareImage.width, 1600);
  assert.equal(recruitingShareImage.height, 900);
  assert.match(defaultSeoDescription, /신문 스크랩/);
  assert.equal(defaultSeoDescription.includes(["Invest", "in", "yourself"].join(" ")), false);
  assert.match(layout, /recruitingShareImage/);
  assert.match(home, /recruitingShareImage/);
  assert.match(robots, /siteUrl/);
  assert.match(sitemap, /siteUrl/);
});

test("Next config applies baseline security headers and admin no-store cache", () => {
  const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  const proxy = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");

  assert.match(config, /X-Content-Type-Options/);
  assert.match(config, /X-Frame-Options/);
  assert.match(config, /Referrer-Policy/);
  assert.match(config, /Permissions-Policy/);
  assert.match(config, /frame-ancestors 'none'/);
  assert.match(proxy, /export function proxy/);
  assert.match(proxy, /pathname\.startsWith\("\/admin"\)/);
  assert.match(proxy, /pathname\.startsWith\("\/api\/admin"\)/);
  assert.match(proxy, /matcher: \["\/admin\/:path\*", "\/api\/admin\/:path\*"\]/);
  assert.match(config, /no-store, max-age=0/);
  assert.match(proxy, /no-store, max-age=0/);
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

test("request json helper rejects malformed or non-object bodies", async () => {
  const malformed = await readJsonObject(
    new Request("https://example.test", { method: "POST", body: "not-json" }),
    "잘못된 요청"
  );
  assert.equal(malformed.error, "잘못된 요청");
  assert.equal(malformed.data, null);

  const arrayBody = await readJsonObject(
    new Request("https://example.test", {
      method: "POST",
      body: JSON.stringify([]),
      headers: { "content-type": "application/json" },
    }),
    "잘못된 요청"
  );
  assert.equal(arrayBody.error, "잘못된 요청");
  assert.equal(arrayBody.data, null);

  const objectBody = await readJsonObject(
    new Request("https://example.test", {
      method: "POST",
      body: JSON.stringify({ ok: true }),
      headers: { "content-type": "application/json" },
    }),
    "잘못된 요청"
  );
  assert.equal(objectBody.error, null);
  assert.equal(isRecord(objectBody.data), true);
  assert.equal(objectBody.data?.ok, true);
});

test("admin media records are mutated only through dedicated media APIs", () => {
  assert.equal(
    getCmsResourceMutationBlockMessage("media"),
    "미디어는 전용 업로드/수정 API에서만 변경할 수 있습니다"
  );
  assert.equal(getCmsResourceMutationBlockMessage("blocks"), null);
  assert.equal(isCmsMediaBucket(cmsMediaBucket), true);
  assert.equal(isCmsMediaBucket("applications"), false);
});

test("CMS media upload validation supports application forms and blocks MIME mismatch", () => {
  assert.equal(
    getCmsMediaUploadValidationError(
      "9기_지원서.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      1024
    ),
    null
  );
  assert.equal(getCmsMediaUploadValidationError("9기_지원서.hwp", "application/x-hwp", 1024), null);
  assert.equal(getCmsMediaKind(".docx"), "document");
  assert.equal(getCmsMediaKind(".webp"), "image");
  assert.equal(
    getCmsMediaUploadValidationError("지원서.docx", "application/pdf", 1024),
    "파일 확장자와 MIME 형식이 일치하지 않습니다"
  );
});

test("application file storage paths avoid applicant identifiers", () => {
  assert.equal(normalizeApplicationFileName("C:\\fake\\홍길동_지원서.pdf"), "홍길동_지원서.pdf");
  assert.equal(getApplicationFileExtension("홍길동_지원서.PDF"), ".pdf");
  assert.equal(
    getApplicationFileValidationError("홍길동_지원서.pdf", "application/pdf", 1024),
    null
  );
  assert.equal(
    getApplicationFileValidationError("홍길동_지원서.pdf", "image/png", 1024),
    "파일 형식이 확장자와 일치하지 않습니다. .hwp, .docx, .pdf 파일만 제출해주세요."
  );

  const storagePath = buildApplicationStoragePath(9, ".pdf", "fixed-file-id");
  assert.equal(storagePath, "9/fixed-file-id.pdf");
  assert.equal(storagePath.includes("2021123456"), false);
});

test("admin email notification avoids implicit recipients and applicant PII", () => {
  assert.deepEqual(getAdminEmailRecipients("admin@example.com, bad-email, ADMIN@example.com"), [
    "admin@example.com",
  ]);
  assert.deepEqual(getAdminEmailRecipients(""), []);
  assert.equal(getResendFromEmail("금은동 <notice@example.com>"), "금은동 <notice@example.com>");
  assert.equal(getResendFromEmail(""), null);

  const email = buildAdminEmail({ generation: 9 });

  assert.equal(email.subject, "[금은동] 새로운 지원서 접수");
  assert.equal(email.subject.includes("홍길동"), false);
  assert.equal(email.subject.includes("2021123456"), false);
  assert.equal(email.text.includes("홍길동"), false);
  assert.equal(email.text.includes("2021123456"), false);
  assert.equal(email.text.includes("01012345678"), false);
  assert.match(email.text, /9기/);
});
