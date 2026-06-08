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
import {
  formatKoreanDateTime,
  getRecruitmentPhase,
  getRecruitmentPhaseLabel,
  isRecruitmentOpen,
} from "../src/lib/recruitment";
import { buildRecruitmentOperationReport } from "../src/lib/recruitment-operations";
import { buildRecruitmentShareKit } from "../src/lib/recruitment-share-kit";
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
  applicantAdminNoteMaxLength,
  validateAndNormalizeApplicantPatch,
} from "../src/lib/applicant-admin";
import { buildApplicantAuditMetadata } from "../src/lib/applicant-audit";
import { buildApplicantGenerationOptions, filterApplicants } from "../src/lib/applicant-filters";
import {
  getOptionalCmsHrefError,
  isSafeCmsHref,
  normalizeOptionalCmsHref,
} from "../src/lib/cms-links";
import {
  buildCmsMediaReferenceCandidates,
  collectCmsMediaReferences,
  isCmsMediaReferenceValue,
} from "../src/lib/media-references";
import {
  buildOrganizationSiteExport,
  inspectOrganizationSiteExportBundle,
  organizationSiteExportResourceKeys,
  validateOrganizationSiteExportBundle,
} from "../src/lib/organization-export";
import {
  isOrganizationThemePreset,
  organizationSiteModules,
  organizationSiteQualityGates,
  organizationSiteUseCases,
  organizationSiteVerticals,
  organizationThemePresets,
} from "../src/lib/organization-site-model";
import {
  buildContentFreshnessReport,
  buildSiteReadinessReport,
  buildSiteVerticalFitReport,
} from "../src/lib/site-readiness";
import { buildRecruitingFunnelReport } from "../src/lib/recruiting-funnel";
import {
  getCmsMediaKind,
  getCmsMediaUploadValidationError,
} from "../src/lib/cms-media-files";
import { validateAndNormalizeCmsResourcePayload } from "../src/lib/cms-resource-validation";
import {
  getHealthStatus,
  isLikelyJwt,
  isValidHttpsUrl,
  sanitizeHealthError,
} from "../src/lib/health";
import { getHealthRemediation } from "../src/lib/health-remediation";
import { buildLaunchReadinessBrief, buildLaunchReadinessReport } from "../src/lib/launch-readiness";
import {
  validateAndNormalizeRecruitmentPayload,
  validateRecruitmentTimelinePatch,
} from "../src/lib/recruitment-admin";
import { isRecord, readJsonObject } from "../src/lib/request-json";
import { validateAndNormalizeSiteSettingsValue } from "../src/lib/site-settings";
import { fallbackBlocks } from "../src/lib/cms-fallback";
import { defaultSeoDescription, recruitingShareImage, siteUrl } from "../src/lib/seo";
import { fileRules, validateFile, validationRules } from "../src/lib/validations";
import type { RecruitmentCycle, SiteSettingsValue } from "../src/types";

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

const baseSettings: SiteSettingsValue = {
  site_title: "금은동",
  club_name: "충북대학교 금융권 취업 동아리 금은동",
  organization_type: "금융권 취업 동아리",
  founded_label: "Est. 2021",
  brand_statement: "읽고, 말하고, 연결합니다",
  brand_preset: "gold",
  logo_url: "/images/logo.svg",
  share_image_url: "/images/gold-recruiting-board.png",
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
  const testName = ["홍", "길동"].join("");
  assert.equal(escapeCsvValue(`${testName},"메모"`), `"${testName},""메모"""`);
  assert.equal(toCsv(["이름", "메모"], [[testName, "1차\n확인"]]), `이름,메모\n${testName},"1차\n확인"`);
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

test("applicant admin patch validation bounds sensitive review fields", () => {
  assert.deepEqual(
    validateAndNormalizeApplicantPatch({
      status: "interview",
      admin_note: "  확인 필요  ",
      review_score: 88,
    }),
    {
      error: null,
      update: {
        status: "interview",
        admin_note: "확인 필요",
        review_score: 88,
      },
    }
  );

  assert.deepEqual(validateAndNormalizeApplicantPatch({ admin_note: "   " }), {
    error: null,
    update: { admin_note: null },
  });
  assert.equal(
    validateAndNormalizeApplicantPatch({ admin_note: "a".repeat(applicantAdminNoteMaxLength + 1) }).error,
    `관리자 메모는 ${applicantAdminNoteMaxLength}자 이하여야 합니다`
  );
  assert.equal(validateAndNormalizeApplicantPatch({ review_score: 101 }).error, "점수는 0~100 사이의 정수여야 합니다");
  assert.equal(validateAndNormalizeApplicantPatch({ status: "hold" }).error, "지원자 상태값이 올바르지 않습니다");
});

test("applicant filters combine query, status, and generation", () => {
  const applicants = [
    {
      id: "a1",
      name: "김지원",
      student_id: "20240001",
      email: "a@example.com",
      phone: "010-0000-0001",
      file_url: "",
      file_name: "a.pdf",
      generation: 9,
      status: "pending" as const,
      applied_at: "2026-01-01T00:00:00.000Z",
      admin_note: null,
    },
    {
      id: "a2",
      name: "박면접",
      student_id: "20240002",
      email: "b@example.com",
      phone: "010-0000-0002",
      file_url: "",
      file_name: "b.pdf",
      generation: 10,
      status: "interview" as const,
      applied_at: "2026-01-02T00:00:00.000Z",
      admin_note: "IB 준비",
    },
  ];

  assert.deepEqual(buildApplicantGenerationOptions(applicants), [
    { value: "10", label: "10기" },
    { value: "9", label: "9기" },
  ]);
  assert.deepEqual(
    filterApplicants({ applicants, status: "interview", generation: "10" }).map((applicant) => applicant.id),
    ["a2"]
  );
  assert.deepEqual(
    filterApplicants({ applicants, query: "IB", status: "all", generation: "all" }).map((applicant) => applicant.id),
    ["a2"]
  );
  assert.deepEqual(filterApplicants({ applicants, status: "accepted", generation: "all" }), []);
});

test("recruiting funnel report summarizes applicant status without PII", () => {
  const report = buildRecruitingFunnelReport([
    { status: "pending" },
    { status: "reviewed" },
    { status: "interview" },
    { status: "accepted" },
    { status: "rejected" },
  ]);

  assert.equal(report.total, 5);
  assert.equal(report.reviewRate, 80);
  assert.equal(report.interviewRate, 60);
  assert.equal(report.decisionRate, 40);
  assert.equal(report.acceptanceRate, 50);
  assert.equal(report.stages.find((stage) => stage.key === "active_pipeline")?.count, 3);
  assert.equal(report.stages.find((stage) => stage.key === "decisioned")?.count, 2);

  const empty = buildRecruitingFunnelReport([]);
  assert.equal(empty.reviewRate, 0);
  assert.equal(empty.acceptanceRate, 0);
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
  assert.equal(getRecruitmentPhaseLabel("open"), "모집 중");
  assert.equal(formatKoreanDateTime(null), "일정 별도 안내");
});

test("recruitment operation report catches schedule, form, and privacy gaps", () => {
  const now = new Date("2026-02-25T00:00:00+09:00");
  const complete = buildRecruitmentOperationReport(
    [
      {
        ...baseCycle,
        docx_url: "/files/gold-9.docx",
        document_result_at: "2026-03-03T18:00:00+09:00",
        interview_at: "2026-03-05T18:00:00+09:00",
        final_result_at: "2026-03-07T18:00:00+09:00",
        requirements: ["충북대학교 재학생"],
      },
    ],
    now
  );

  assert.equal(complete.status, "pass");
  assert.equal(complete.phaseLabel, "모집 중");
  assert.equal(complete.daysUntilDeadline, 5);

  const incomplete = buildRecruitmentOperationReport(
    [
      {
        ...baseCycle,
        docx_url: null,
        hwp_url: null,
        document_result_at: null,
        interview_at: null,
        final_result_at: null,
        privacy_retention: "",
      },
    ],
    now
  );

  assert.equal(incomplete.status, "fail");
  assert.equal(incomplete.items.find((item) => item.key === "forms")?.status, "warning");
  assert.equal(incomplete.items.find((item) => item.key === "privacy")?.status, "fail");

  const empty = buildRecruitmentOperationReport([], now);
  assert.equal(empty.status, "fail");
  assert.equal(empty.phaseLabel, "모집 없음");
});

test("recruitment share kit builds public recruiting copy without private data", () => {
  const kit = buildRecruitmentShareKit(
    baseSettings,
    [
      {
        ...baseCycle,
        docx_url: "/files/gold-9.docx",
        hwp_url: "/files/gold-9.hwp",
        requirements: ["충북대학교 재학생", "금융권 진로 관심자"],
        meeting_time: "매주 수요일 18:30",
        fee_note: "학기별 30,000원",
      },
    ],
    new Date("2026-02-25T00:00:00+09:00")
  );

  assert.equal(kit.title, "금은동 9기 모집 안내");
  assert.equal(kit.statusLabel, "모집 중");
  assert.match(kit.body, /접수:/);
  assert.match(kit.body, /지원 자격: 충북대학교 재학생, 금융권 진로 관심자/);
  assert.match(kit.body, /지원 안내: https:\/\/cbnugold\.vercel\.app\/join/);
  assert.equal(kit.body.includes("admin_note"), false);
  assert.equal(kit.body.includes("review_score"), false);
  assert.equal(kit.links.some((link) => link.label === "DOCX 지원서" && link.href.endsWith("/files/gold-9.docx")), true);
});

test("rate limit blocks requests after the configured limit", () => {
  const key = `test:${Date.now()}:${Math.random()}`;
  assert.equal(checkRateLimit(key, 2, 60_000).ok, true);
  assert.equal(checkRateLimit(key, 2, 60_000).ok, true);
  assert.equal(checkRateLimit(key, 2, 60_000).ok, false);
});

test("application validation avoids embedded example personal data", () => {
  const testPhone = ["010", "1234", "5678"].join("");
  const testPhoneWithHyphen = ["010", "1234", "5678"].join("-");

  assert.equal(validationRules.phone.message.includes(testPhone), false);
  assert.equal(validationRules.phone.message.includes(testPhoneWithHyphen), false);
  assert.equal(
    validateFile({ name: "application.exe", size: 1024 } as File),
    fileRules.message
  );
  assert.equal(
    validateFile({ name: "application.pdf", size: fileRules.maxSize + 1 } as File),
    "파일 크기는 10MB 이하여야 합니다"
  );
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
  const adminPage = readFileSync(new URL("../src/app/admin/page.tsx", import.meta.url), "utf8");
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
  assert.equal(firstSemester?.media_url, "/images/semester-flow-board.webp");
  assert.match(schema, /'join', 'first-semester'/);
  assert.match(schema, /\/images\/semester-flow-board\.webp/);
  assert.match(adminPage, /핵심 블록 매핑/);
  assert.match(adminPage, /first-semester/);
  assert.match(adminPage, /운영 상태/);
  assert.match(adminPage, /운영 전환 게이트/);
  assert.match(adminPage, /공유용 브리프/);
  assert.match(adminPage, /\/api\/health/);
});

test("SEO metadata uses the recruiting visual and Korean description", () => {
  const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  const header = readFileSync(new URL("../src/components/layout/Header.tsx", import.meta.url), "utf8");
  const footer = readFileSync(new URL("../src/components/layout/Footer.tsx", import.meta.url), "utf8");
  const home = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
  const robots = readFileSync(new URL("../src/app/robots.ts", import.meta.url), "utf8");
  const sitemap = readFileSync(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");
  const logoSvg = readFileSync(new URL("../public/images/logo.svg", import.meta.url), "utf8");
  const logoPng = readFileSync(new URL("../public/images/logo.png", import.meta.url));

  assert.ok(siteUrl.length > 0);
  assert.doesNotMatch(siteUrl, /\/$/);
  assert.equal(recruitingShareImage.url, "/images/gold-recruiting-board.png");
  assert.equal(recruitingShareImage.width, 1600);
  assert.equal(recruitingShareImage.height, 900);
  assert.ok(logoPng.byteLength > 1000);
  assert.match(logoSvg, /금은동 로고/);
  assert.equal(logoSvg.toLowerCase().includes(["invest", "in", "yourself"].join(" ")), false);
  assert.match(header, /settings\.logo_url/);
  assert.match(header, /<img/);
  assert.match(footer, /settings\.logo_url/);
  assert.match(footer, /<img/);
  assert.match(defaultSeoDescription, /신문 스크랩/);
  assert.equal(defaultSeoDescription.includes(["Invest", "in", "yourself"].join(" ")), false);
  assert.match(layout, /data-brand-preset/);
  assert.match(home, /getShareImage/);
  assert.match(home, /settings\.share_image_url/);
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
  const healthRoute = readFileSync(new URL("../src/app/api/health/route.ts", import.meta.url), "utf8");
  const adminPage = readFileSync(new URL("../src/app/admin/page.tsx", import.meta.url), "utf8");

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
  assert.equal(
    sanitizeHealthError(
      Object.assign(new Error("fetch failed"), {
        cause: Object.assign(new Error("getaddrinfo ENOTFOUND example.supabase.co"), { code: "ENOTFOUND" }),
      })
    ),
    "Supabase 호스트를 찾을 수 없습니다"
  );
  assert.equal(isValidHttpsUrl("https://example.supabase.co"), true);
  assert.equal(isValidHttpsUrl("http://example.supabase.co"), false);
  assert.equal(isLikelyJwt("aaa.bbb.ccc"), true);
  assert.equal(isLikelyJwt("not-a-jwt"), false);
  assert.match(healthRoute, /env:supabase_url_format/);
  assert.match(healthRoute, /env:supabase_anon_key_format/);
  assert.match(healthRoute, /env:supabase_service_role_key_format/);
  assert.match(adminPage, /getHealthRemediation/);
  assert.match(adminPage, /buildLaunchReadinessReport/);
  assert.match(adminPage, /buildLaunchReadinessBrief/);
  assert.match(adminPage, /getAdminBootstrapErrorMessage/);
  assert.match(adminPage, /router\.replace\("\/admin\/login"\)/);
  assert.match(adminPage, /관리자 접근 확인 필요/);
  assert.match(adminPage, /조치:/);
  assert.match(
    getHealthRemediation({
      name: "supabase:public_read",
      message: "Supabase 호스트를 찾을 수 없습니다",
    }),
    /URL\/key 세트/
  );
  assert.match(
    getHealthRemediation({ name: "storage:applications" }),
    /applications private 버킷/
  );
});

test("launch readiness gate blocks production cutover until core checks pass", () => {
  const blocked = buildLaunchReadinessReport({
    health: {
      status: "degraded",
      checks: [{ name: "supabase:public_read", ok: false, message: "Supabase 호스트를 찾을 수 없습니다" }],
    },
    readiness: { status: "pass", score: 100 },
    freshness: { status: "pass" },
    recruitment: { status: "pass" },
  });

  assert.equal(blocked.status, "fail");
  assert.equal(blocked.label, "전환 보류");
  assert.equal(blocked.items.find((item) => item.key === "runtime-health")?.status, "fail");
  assert.match(buildLaunchReadinessBrief(blocked), /# 운영 전환 브리프/);
  assert.match(buildLaunchReadinessBrief(blocked), /판정: 전환 보류/);
  assert.match(buildLaunchReadinessBrief(blocked), /운영 상태 확인: 배포·DB 연결/);
  assert.match(buildLaunchReadinessBrief(blocked), /지원자 개인정보/);

  const ready = buildLaunchReadinessReport({
    health: { status: "ok", checks: [{ name: "supabase:public_read", ok: true }] },
    readiness: { status: "pass", score: 100 },
    freshness: { status: "pass" },
    recruitment: { status: "pass" },
  });

  assert.equal(ready.status, "pass");
  assert.equal(ready.label, "전환 가능");
  assert.match(buildLaunchReadinessBrief(ready), /추가 보완 조치 없음/);
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

test("site settings validation backfills reusable organization fields", () => {
  const legacySettings = { ...baseSettings };
  delete (legacySettings as Partial<typeof baseSettings>).organization_type;
  delete (legacySettings as Partial<typeof baseSettings>).founded_label;
  delete (legacySettings as Partial<typeof baseSettings>).brand_statement;
  delete (legacySettings as Partial<typeof baseSettings>).brand_preset;
  delete (legacySettings as Partial<typeof baseSettings>).logo_url;
  delete (legacySettings as Partial<typeof baseSettings>).share_image_url;

  const result = validateAndNormalizeSiteSettingsValue(legacySettings);

  assert.equal(result.error, null);
  assert.equal(result.value?.brand_preset, "gold");
  assert.equal(result.value?.logo_url, "/images/logo.svg");
  assert.equal(result.value?.share_image_url, "/images/gold-recruiting-board.png");
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

  assert.equal(
    validateAndNormalizeSiteSettingsValue({
      ...baseSettings,
      brand_preset: "purple",
    }).error,
    "테마 프리셋은 gold, navy, green, graphite 중 하나여야 합니다"
  );

  assert.equal(
    validateAndNormalizeSiteSettingsValue({
      ...baseSettings,
      logo_url: "javascript:alert(1)",
    }).error,
    "로고 URL은 사이트 내부 경로 또는 https URL만 사용할 수 있습니다"
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

test("recruitment timeline patch validation compares against existing dates", () => {
  assert.equal(
    validateRecruitmentTimelinePatch(
      {
        start_at: "2026-02-10T00:00:00.000Z",
        end_at: "2026-02-20T00:00:00.000Z",
      },
      {
        end_at: "2026-02-01T00:00:00.000Z",
      }
    ),
    "모집 마감 일시는 모집 시작 이후여야 합니다"
  );
  assert.equal(
    validateRecruitmentTimelinePatch(
      {
        start_at: "2026-02-10T00:00:00.000Z",
        end_at: "2026-02-20T00:00:00.000Z",
      },
      {
        document_result_at: "2026-02-19T00:00:00.000Z",
      }
    ),
    "서류 발표 일시는 모집 마감 이후여야 합니다"
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
  const adminPage = readFileSync(new URL("../src/app/admin/page.tsx", import.meta.url), "utf8");
  const mediaDeleteRoute = readFileSync(new URL("../src/app/api/admin/media/[id]/route.ts", import.meta.url), "utf8");

  assert.equal(
    getCmsResourceMutationBlockMessage("media"),
    "미디어는 전용 업로드/수정 API에서만 변경할 수 있습니다"
  );
  assert.equal(getCmsResourceMutationBlockMessage("blocks"), null);
  assert.equal(isCmsMediaBucket(cmsMediaBucket), true);
  assert.equal(isCmsMediaBucket("applications"), false);
  assert.match(adminPage, /getCmsMediaUploadValidationError/);
  assert.match(adminPage, /파일 해제/);
  assert.match(adminPage, /application\/octet-stream/);
  assert.match(adminPage, /getAdminApiErrorMessage/);
  assert.match(adminPage, /whitespace-pre-line/);
  assert.match(mediaDeleteRoute, /collectCmsMediaReferences/);
  assert.match(mediaDeleteRoute, /status: 409/);
});

test("organization site blueprint keeps reusable CMS operating modules explicit", () => {
  const adminPage = readFileSync(new URL("../src/app/admin/page.tsx", import.meta.url), "utf8");
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  const blueprint = readFileSync(new URL("../docs/ORG_SITE_PLATFORM_BLUEPRINT.md", import.meta.url), "utf8");
  const cutover = readFileSync(new URL("../docs/DEPLOYMENT_CUTOVER_CHECKLIST.md", import.meta.url), "utf8");
  const checkOps = readFileSync(new URL("../scripts/check-ops.mjs", import.meta.url), "utf8");
  const checkDeploy = readFileSync(new URL("../scripts/check-deployment.mjs", import.meta.url), "utf8");
  const checkSupabase = readFileSync(new URL("../scripts/check-supabase-env.mjs", import.meta.url), "utf8");

  assert.deepEqual(
    organizationSiteModules.map((item) => item.key),
    ["identity", "content", "recruiting", "operations"]
  );
  assert.equal(organizationSiteQualityGates.length >= 5, true);
  assert.deepEqual(
    organizationThemePresets.map((item) => item.key),
    ["gold", "navy", "green", "graphite"]
  );
  assert.equal(isOrganizationThemePreset("gold"), true);
  assert.equal(isOrganizationThemePreset("purple"), false);
  assert.equal(organizationSiteUseCases.length >= 4, true);
  assert.deepEqual(
    organizationSiteVerticals.map((item) => item.key),
    ["recruiting_club", "academic_society", "startup_team", "event_program"]
  );
  assert.match(adminPage, /organizationSiteModules/);
  assert.match(adminPage, /organizationThemePresets/);
  assert.match(adminPage, /organizationSiteVerticals/);
  assert.match(adminPage, /지원 퍼널/);
  assert.match(adminPage, /모집 운영/);
  assert.match(adminPage, /모집 홍보 패키지/);
  assert.match(adminPage, /기수 필터/);
  assert.match(adminPage, /buildRecruitingFunnelReport/);
  assert.match(adminPage, /buildRecruitmentOperationReport/);
  assert.match(adminPage, /buildRecruitmentShareKit/);
  assert.match(adminPage, /재사용 가능한 대상/);
  assert.match(adminPage, /적용 분야별 운영 초점/);
  assert.match(adminPage, /단체형 홈페이지 운영 모델/);
  assert.match(readme, /ORG_SITE_PLATFORM_BLUEPRINT/);
  assert.match(readme, /DEPLOYMENT_CUTOVER_CHECKLIST/);
  assert.match(readme, /check:deploy/);
  assert.match(readme, /check:supabase/);
  assert.match(blueprint, /단체형 CMS 홈페이지 확장 Blueprint/);
  assert.match(blueprint, /지원서 파일 public URL 미노출/);
  assert.match(cutover, /배포 전환 및 운영 검증 체크리스트/);
  assert.match(cutover, /check:deploy/);
  assert.match(cutover, /check:supabase/);
  assert.match(cutover, /Server: Vercel/);
  assert.match(checkOps, /failedCheckDetails/);
  assert.match(checkDeploy, /canonical domain still points to Wix\/Pepyaka/);
  assert.match(checkDeploy, /VERCEL_SITE_URL/);
  assert.match(checkDeploy, /api\/health/);
  assert.match(checkSupabase, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(checkSupabase, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(checkSupabase, /storage:buckets/);
  assert.doesNotMatch(checkSupabase, /console\.log\(env/);
});

test("admin operating model copy does not contain mojibake", () => {
  const files = [
    readFileSync(new URL("../src/lib/site-readiness.ts", import.meta.url), "utf8"),
    readFileSync(new URL("../src/lib/organization-site-model.ts", import.meta.url), "utf8"),
  ].join("\n");

  assert.doesNotMatch(files, /\uFFFD/);
  assert.doesNotMatch(files, /[\uF900-\uFAFF]/);
  assert.doesNotMatch(files, /[?][가-힣]/);
  assert.match(files, /정체성 문구/);
  assert.match(files, /리크루팅형 동아리/);
  assert.match(files, /운영 통제/);
});

test("site readiness report surfaces CMS launch gaps", () => {
  const completeInput = {
    settings: {
      ...baseSettings,
      organization_type: "금융권 취업 동아리",
      logo_url: "/images/logo.svg",
      share_image_url: "/images/gold-recruiting-board.png",
    },
    recruitment: [{ ...baseCycle, status: "published", privacy_retention: "지원 결과 발표 후 6개월" }],
    pages: ["home", "about", "activity", "join"].map((slug, index) => ({
      slug,
      title: slug,
      description: null,
      status: "published",
      sort_order: index,
    })),
    blocks: [
      { page_slug: "home", block_key: "hero", title: null, subtitle: null, body: null, cta_label: null, cta_href: null, media_url: null, status: "published", sort_order: 1 },
      { page_slug: "home", block_key: "proof", title: null, subtitle: null, body: null, cta_label: null, cta_href: null, media_url: null, status: "published", sort_order: 2 },
      { page_slug: "join", block_key: "first-semester", title: null, subtitle: null, body: null, cta_label: null, cta_href: null, media_url: null, status: "published", sort_order: 3 },
    ],
    activities: [1, 2, 3].map((sort_order) => ({
      title: `활동 ${sort_order}`,
      subtitle: null,
      description: "활동 설명",
      category: "regular",
      tags: [],
      status: "published",
      sort_order,
    })),
    achievements: [1, 2, 3].map((sort_order) => ({
      title: `성과 ${sort_order}`,
      organization: null,
      result: "성과",
      kind: "metric",
      year: 2025,
      status: "published",
      sort_order,
    })),
    faqs: [1, 2, 3].map((sort_order) => ({
      question: `질문 ${sort_order}`,
      answer: "답변",
      status: "published",
      sort_order,
    })),
    media: [1, 2].map((sort_order) => ({
      bucket: "cms-media",
      path: `asset-${sort_order}.webp`,
      public_url: `/images/asset-${sort_order}.webp`,
      alt: "이미지",
      kind: "image",
      status: "published",
    })),
    admins: [{ id: "owner-id", email: "owner@example.com", name: "Owner", role: "owner", is_active: true }],
  };
  const complete = buildSiteReadinessReport(completeInput);

  assert.equal(complete.status, "pass");
  assert.equal(complete.score, 100);
  assert.equal(complete.items.every((item) => item.actionLabel && item.targetTab), true);
  assert.equal(complete.items.find((item) => item.key === "recruitment")?.targetTab, "recruitment");

  const freshInput = {
    ...completeInput,
    recruitment: [
      {
        ...completeInput.recruitment[0],
        end_at: "2026-06-30T18:00:00+09:00",
      },
    ],
    pages: completeInput.pages.map((item) => ({ ...item, updated_at: "2026-05-01T00:00:00.000Z" })),
    blocks: completeInput.blocks.map((item) => ({ ...item, updated_at: "2026-05-01T00:00:00.000Z" })),
    media: completeInput.media.map((item) => ({ ...item, updated_at: "2026-05-01T00:00:00.000Z" })),
  };
  const freshness = buildContentFreshnessReport(freshInput, new Date("2026-06-05T00:00:00.000Z"));

  assert.equal(freshness.status, "pass");
  assert.equal(freshness.items.every((item) => item.actionLabel && item.targetTab), true);
  assert.equal(freshness.items.find((item) => item.key === "fresh-achievements")?.status, "pass");

  const expiredRecruitment = buildContentFreshnessReport(
    {
      ...freshInput,
      recruitment: [{ ...freshInput.recruitment[0], end_at: "2026-03-01T18:00:00+09:00" }],
    },
    new Date("2026-06-05T00:00:00.000Z")
  );

  assert.equal(expiredRecruitment.status, "fail");
  assert.equal(expiredRecruitment.items.find((item) => item.key === "fresh-recruitment")?.status, "fail");

  const staleContent = buildContentFreshnessReport(
    {
      ...freshInput,
      achievements: freshInput.achievements.map((item) => ({ ...item, year: 2023 })),
      faqs: [],
    },
    new Date("2026-06-05T00:00:00.000Z")
  );

  assert.equal(staleContent.status, "warning");
  assert.equal(staleContent.items.find((item) => item.key === "fresh-achievements")?.status, "warning");
  assert.equal(staleContent.items.find((item) => item.key === "fresh-faqs")?.status, "warning");

  const incompleteInput = {
    settings: { ...baseSettings, hero_title: "", logo_url: "http://unsafe.example/logo.png" },
    recruitment: [],
    pages: [],
    blocks: [],
    activities: [],
    achievements: [],
    faqs: [],
    media: [],
    admins: [],
  };
  const incomplete = buildSiteReadinessReport(incompleteInput);

  assert.equal(incomplete.status, "fail");
  assert.equal(incomplete.items.some((item) => item.key === "admin-owner" && item.status === "fail"), true);
  assert.equal(incomplete.items.some((item) => item.key === "recruitment" && item.status === "fail"), true);
  assert.equal(incomplete.items.some((item) => item.key === "brand-assets" && item.status === "warning"), true);
  assert.equal(incomplete.items.find((item) => item.key === "admin-owner")?.targetTab, "admins");

  const permissionLimited = buildSiteReadinessReport({ ...incompleteInput, canVerifyAdmins: false });
  const ownerCheck = permissionLimited.items.find((item) => item.key === "admin-owner");
  assert.equal(ownerCheck?.status, "warning");
  assert.equal(ownerCheck?.targetTab, "overview");
  assert.equal(ownerCheck?.actionLabel, "소유자에게 확인 요청");

  const verticalFit = buildSiteVerticalFitReport(completeInput);
  assert.deepEqual(
    verticalFit.map((item) => item.key),
    ["recruiting_club", "academic_society", "startup_team", "event_program"]
  );
  assert.equal(verticalFit.find((item) => item.key === "recruiting_club")?.status, "pass");
  assert.equal(verticalFit.every((item) => item.score >= 0 && item.score <= 100), true);
  assert.equal(verticalFit.every((item) => item.strengths.length + item.gaps.length > 0), true);
});

test("organization site export excludes sensitive operations data", () => {
  const exported = buildOrganizationSiteExport(
    {
      settings: baseSettings,
      pages: [{ id: "page-id", slug: "home", title: "홈", description: null, status: "published", sort_order: 1 }],
      blocks: [],
      recruitment: [],
      activities: [],
      achievements: [],
      history: [],
      faqs: [],
      media: [
        {
          id: "media-id",
          bucket: "cms-media",
          path: "brand.webp",
          public_url: "/images/brand.webp",
          alt: "브랜드 이미지",
          kind: "image",
          status: "published",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    },
    "2026-01-01T00:00:00.000Z"
  );

  assert.deepEqual(Object.keys(exported.resources), [...organizationSiteExportResourceKeys]);
  assert.equal(JSON.stringify(exported).includes("applicants"), false);
  assert.equal(JSON.stringify(exported).includes("admin_profiles"), false);
  assert.equal(JSON.stringify(exported).includes("audit_logs"), false);
  assert.equal("id" in exported.resources.pages[0], false);
  assert.equal("updated_at" in exported.resources.media[0], false);
  assert.deepEqual(validateOrganizationSiteExportBundle(exported), { ok: true, errors: [] });
});

test("organization site export validation rejects sensitive or runtime data", () => {
  const exported = buildOrganizationSiteExport(
    {
      settings: baseSettings,
      pages: [],
      blocks: [],
      recruitment: [],
      activities: [],
      achievements: [],
      history: [],
      faqs: [],
      media: [],
    },
    "2026-01-01T00:00:00.000Z"
  );

  const result = validateOrganizationSiteExportBundle({
    ...exported,
    resources: {
      ...exported.resources,
      applicants: [{ name: "지원자", phone: "010-0000-0000" }],
      pages: [{ id: "runtime-id", slug: "home" }],
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.includes("applicants")), true);
  assert.equal(result.errors.some((error) => error.includes("runtime-id")), false);
  assert.equal(result.errors.some((error) => error.includes("런타임 필드")), true);
  assert.equal(result.errors.some((error) => error.includes("민감 필드")), true);
});

test("organization site export inspection summarizes portability gaps", () => {
  const minimal = buildOrganizationSiteExport(
    {
      settings: baseSettings,
      pages: [{ slug: "home", title: "홈", description: null, status: "published", sort_order: 1 }],
      blocks: [{ page_slug: "home", block_key: "hero", title: "홈", subtitle: null, body: null, cta_label: null, cta_href: null, media_url: null, status: "published", sort_order: 1 }],
      recruitment: [],
      activities: [],
      achievements: [],
      history: [],
      faqs: [],
      media: [],
    },
    "2026-01-01T00:00:00.000Z"
  );
  const inspection = inspectOrganizationSiteExportBundle(minimal);

  assert.equal(inspection.ok, true);
  assert.equal(inspection.counts.settings, 1);
  assert.equal(inspection.counts.pages, 1);
  assert.equal(inspection.warnings.some((warning) => warning.includes("공개 페이지가 4개 미만")), true);
  assert.equal(inspection.warnings.some((warning) => warning.includes("join/first-semester")), true);

  const rejected = inspectOrganizationSiteExportBundle({
    ...minimal,
    resources: {
      ...minimal.resources,
      applicants: [{ phone: "010-0000-0000" }],
      pages: [{ ...minimal.resources.pages[0], id: "runtime-id" }],
    },
  });

  assert.equal(rejected.ok, false);
  assert.equal(rejected.errors.some((error) => error.includes("applicants")), true);
  assert.equal(rejected.counts.pages, 1);
});

test("CMS media delete guard detects public content references", () => {
  const target = {
    bucket: cmsMediaBucket,
    path: "2026-board.webp",
    public_url: "https://project.supabase.co/storage/v1/object/public/cms-media/2026-board.webp",
  };

  assert.equal(buildCmsMediaReferenceCandidates(target).includes(target.public_url), true);
  assert.equal(
    isCmsMediaReferenceValue(
      "https://project.supabase.co/storage/v1/object/public/cms-media/2026-board.webp?download=1",
      target
    ),
    true
  );
  assert.equal(isCmsMediaReferenceValue("https://example.com/2026-board.webp", target), false);

  const references = collectCmsMediaReferences(target, {
    blocks: [
      {
        page_slug: "home",
        block_key: "hero",
        title: "Hero",
        status: "published",
        media_url: target.public_url,
      },
    ],
    recruitment: [
      {
        generation: 9,
        title: "9기 모집",
        status: "published",
        docx_url: target.public_url,
        hwp_url: null,
      },
    ],
    settings: [
      {
        key: "homepage",
        status: "published",
        value: {
          shareImage: target.public_url,
        },
      },
    ],
  });

  assert.deepEqual(
    references.map((reference) => `${reference.source}:${reference.field}`),
    ["content_blocks:media_url", "recruitment_cycles:docx_url", "site_settings:homepage.shareImage"]
  );
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
  const testName = ["홍", "길동"].join("");
  const testStudentId = ["2021", "123456"].join("");

  assert.equal(normalizeApplicationFileName(`C:\\fake\\${testName}_지원서.pdf`), `${testName}_지원서.pdf`);
  assert.equal(getApplicationFileExtension(`${testName}_지원서.PDF`), ".pdf");
  assert.equal(
    getApplicationFileValidationError(`${testName}_지원서.pdf`, "application/pdf", 1024),
    null
  );
  assert.equal(
    getApplicationFileValidationError(`${testName}_지원서.pdf`, "image/png", 1024),
    "파일 형식이 확장자와 일치하지 않습니다. .hwp, .docx, .pdf 파일만 제출해주세요."
  );

  const storagePath = buildApplicationStoragePath(9, ".pdf", "fixed-file-id");
  assert.equal(storagePath, "9/fixed-file-id.pdf");
  assert.equal(storagePath.includes(testStudentId), false);
});

test("admin email notification avoids implicit recipients and applicant PII", () => {
  assert.deepEqual(getAdminEmailRecipients("admin@example.com, bad-email, ADMIN@example.com"), [
    "admin@example.com",
  ]);
  assert.deepEqual(getAdminEmailRecipients(""), []);
  assert.equal(getResendFromEmail("금은동 <notice@example.com>"), "금은동 <notice@example.com>");
  assert.equal(getResendFromEmail(""), null);

  const email = buildAdminEmail({ generation: 9 });
  const testName = ["홍", "길동"].join("");
  const testStudentId = ["2021", "123456"].join("");
  const testPhone = ["010", "1234", "5678"].join("");

  assert.equal(email.subject, "[금은동] 새로운 지원서 접수");
  assert.equal(email.subject.includes(testName), false);
  assert.equal(email.subject.includes(testStudentId), false);
  assert.equal(email.text.includes(testName), false);
  assert.equal(email.text.includes(testStudentId), false);
  assert.equal(email.text.includes(testPhone), false);
  assert.match(email.text, /9기/);
});
