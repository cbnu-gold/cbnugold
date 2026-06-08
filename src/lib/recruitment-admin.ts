import { validateAndNormalizeApplicationQuestions } from "@/lib/application-questions";

const dateFields = [
  { key: "start_at", label: "모집 시작" },
  { key: "end_at", label: "모집 마감" },
  { key: "document_result_at", label: "서류 발표" },
  { key: "interview_at", label: "면접" },
  { key: "final_result_at", label: "최종 발표" },
] as const;

export const recruitmentTimelineFieldKeys = dateFields.map((field) => field.key);

const textFields = [
  { key: "title", label: "모집 제목", maxLength: 120, required: true },
  { key: "meeting_time", label: "정규 활동", maxLength: 120, required: false },
  { key: "fee_note", label: "회비 안내", maxLength: 120, required: false },
  { key: "privacy_retention", label: "개인정보 보유 기간", maxLength: 120, required: true },
] as const;

type RecruitmentPayload = Record<string, unknown>;

function getTimestamp(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? Number.NaN : time;
}

function validateTextField(payload: RecruitmentPayload, key: string, label: string, maxLength: number, required: boolean) {
  if (!(key in payload)) return null;
  const value = payload[key];
  if (value === null && !required) return null;
  if (typeof value !== "string") return `${label} 값은 문자열이어야 합니다`;

  const text = value.trim();
  if (required && !text) return `${label} 값이 필요합니다`;
  if (text.length > maxLength) return `${label}은 ${maxLength}자 이하로 입력해야 합니다`;
  payload[key] = text || null;
  return null;
}

export function validateAndNormalizeRecruitmentPayload(payload: RecruitmentPayload) {
  if ("generation" in payload) {
    const generation = Number(payload.generation);
    if (!Number.isInteger(generation) || generation < 1 || generation > 99) {
      return "모집 기수는 1 이상 99 이하의 정수여야 합니다";
    }
    payload.generation = generation;
  }

  if ("is_open" in payload && typeof payload.is_open !== "boolean") {
    return "모집 열림 값은 true 또는 false여야 합니다";
  }

  if ("requires_file" in payload && typeof payload.requires_file !== "boolean") {
    return "파일 첨부 필수 값은 true 또는 false여야 합니다";
  }

  for (const field of textFields) {
    const error = validateTextField(payload, field.key, field.label, field.maxLength, field.required);
    if (error) return error;
  }

  if ("requirements" in payload) {
    if (!Array.isArray(payload.requirements)) return "지원 자격은 배열 형식이어야 합니다";
    const requirements: string[] = [];
    for (const item of payload.requirements) {
      if (typeof item !== "string") return "지원 자격은 문자열만 입력할 수 있습니다";
      const text = item.trim();
      if (text) requirements.push(text);
    }
    if (requirements.length > 20) return "지원 자격은 20개 이하로 입력해야 합니다";
    if (requirements.some((item) => item.length > 120)) {
      return "지원 자격 항목은 120자 이하로 입력해야 합니다";
    }
    payload.requirements = requirements;
  }

  if ("application_questions" in payload) {
    const result = validateAndNormalizeApplicationQuestions(payload.application_questions);
    if (result.error || !result.value) return result.error ?? "지원서 추가 질문 설정이 올바르지 않습니다";
    payload.application_questions = result.value;
  }

  for (const field of dateFields) {
    if (!(field.key in payload)) continue;
    const value = payload[field.key];
    if (value === null || value === "") {
      payload[field.key] = null;
      continue;
    }
    if (typeof value !== "string" || Number.isNaN(getTimestamp(value))) {
      return `${field.label} 일시 형식이 올바르지 않습니다`;
    }
    payload[field.key] = value.trim();
  }

  for (let index = 1; index < dateFields.length; index += 1) {
    const previous = dateFields[index - 1];
    const current = dateFields[index];
    if (!(previous.key in payload) || !(current.key in payload)) continue;

    const previousTime = getTimestamp(payload[previous.key]);
    const currentTime = getTimestamp(payload[current.key]);
    if (previousTime === null || currentTime === null) continue;
    if (previousTime > currentTime) {
      return `${current.label} 일시는 ${previous.label} 이후여야 합니다`;
    }
  }

  return null;
}

export function validateRecruitmentTimelinePatch(
  existing: RecruitmentPayload,
  patch: RecruitmentPayload
) {
  return validateAndNormalizeRecruitmentPayload({ ...existing, ...patch });
}
