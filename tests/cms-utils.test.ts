import test from "node:test";
import assert from "node:assert/strict";
import { escapeCsvValue, toCsv } from "../src/lib/csv";
import { isRecruitmentOpen } from "../src/lib/recruitment";
import type { RecruitmentCycle } from "../src/types";

const baseCycle: RecruitmentCycle = {
  generation: 9,
  title: "금은동 9기 모집",
  is_open: true,
  start_at: null,
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
