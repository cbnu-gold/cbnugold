export const applicantStatuses = ["pending", "reviewed", "interview", "accepted", "rejected"] as const;
export const applicantAdminNoteMaxLength = 1000;

export type ApplicantStatus = (typeof applicantStatuses)[number];
type ApplicantPatchResult =
  | { error: null; update: Record<string, unknown> }
  | { error: string; update: null };

export function validateAndNormalizeApplicantPatch(input: Record<string, unknown>): ApplicantPatchResult {
  const update: Record<string, unknown> = {};

  if ("status" in input) {
    const status = input.status;
    if (typeof status !== "string" || !applicantStatuses.includes(status as ApplicantStatus)) {
      return { error: "지원자 상태값이 올바르지 않습니다", update: null };
    }
    update.status = status;
  }

  if ("admin_note" in input) {
    const note = input.admin_note;
    if (note !== null && typeof note !== "string") {
      return { error: "관리자 메모 형식이 올바르지 않습니다", update: null };
    }

    const normalizedNote = typeof note === "string" ? note.trim() : "";
    if (normalizedNote.length > applicantAdminNoteMaxLength) {
      return { error: `관리자 메모는 ${applicantAdminNoteMaxLength}자 이하여야 합니다`, update: null };
    }
    update.admin_note = normalizedNote || null;
  }

  if ("review_score" in input) {
    const score = input.review_score;
    if (score === null || score === "") {
      update.review_score = null;
    } else if (typeof score === "number" && Number.isInteger(score) && score >= 0 && score <= 100) {
      update.review_score = score;
    } else {
      return { error: "점수는 0~100 사이의 정수여야 합니다", update: null };
    }
  }

  if (Object.keys(update).length === 0) {
    return { error: "수정할 값이 필요합니다", update: null };
  }

  return { error: null, update };
}
