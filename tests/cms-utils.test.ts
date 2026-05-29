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
import { getHealthStatus, sanitizeHealthError } from "../src/lib/health";
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
