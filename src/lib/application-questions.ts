import type { ApplicationAnswers, ApplicationQuestion, ApplicationQuestionType } from "@/types";

export const applicationQuestionTypes: ApplicationQuestionType[] = ["short_text", "long_text", "select"];
export const applicationQuestionMaxCount = 10;
export const applicationQuestionLabelMaxLength = 100;
export const applicationAnswerShortMaxLength = 200;
export const applicationAnswerLongMaxLength = 1200;

export const applicationQuestionTypeLabels: Record<ApplicationQuestionType, string> = {
  short_text: "단답",
  long_text: "장문",
  select: "선택",
};

const idPattern = /^[a-z][a-z0-9_-]{1,39}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function buildApplicationQuestionId(index: number, existing: ApplicationQuestion[] = []) {
  const used = new Set(existing.map((question) => question.id));
  let next = `q_${index + 1}`;
  let suffix = index + 1;
  while (used.has(next)) {
    suffix += 1;
    next = `q_${suffix}`;
  }
  return next;
}

function normalizeQuestionId(value: unknown, index: number, used: Set<string>) {
  const raw = normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  let id = idPattern.test(raw) ? raw : `q_${index + 1}`;
  let suffix = index + 1;
  while (used.has(id)) {
    suffix += 1;
    id = `q_${suffix}`;
  }
  used.add(id);
  return id;
}

function normalizeType(value: unknown): ApplicationQuestionType | null {
  if (applicationQuestionTypes.includes(value as ApplicationQuestionType)) {
    return value as ApplicationQuestionType;
  }
  return null;
}

function normalizeOptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const options: string[] = [];
  for (const item of value) {
    const text = normalizeText(item);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    options.push(text);
  }
  return options;
}

export function validateAndNormalizeApplicationQuestions(value: unknown): {
  value: ApplicationQuestion[] | null;
  error: string | null;
} {
  if (value === null || value === undefined) return { value: [], error: null };
  if (!Array.isArray(value)) return { value: null, error: "지원서 추가 질문은 배열 형식이어야 합니다" };
  if (value.length > applicationQuestionMaxCount) {
    return { value: null, error: `지원서 추가 질문은 ${applicationQuestionMaxCount}개 이하로 설정해야 합니다` };
  }

  const usedIds = new Set<string>();
  const questions: ApplicationQuestion[] = [];

  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) return { value: null, error: "지원서 추가 질문 항목 형식이 올바르지 않습니다" };

    const label = normalizeText(item.label);
    if (!label) return { value: null, error: "지원서 추가 질문 문항을 입력해주세요" };
    if (label.length > applicationQuestionLabelMaxLength) {
      return { value: null, error: `지원서 추가 질문 문항은 ${applicationQuestionLabelMaxLength}자 이하로 입력해야 합니다` };
    }

    const type = normalizeType(item.type);
    if (!type) return { value: null, error: "지원서 추가 질문 유형이 올바르지 않습니다" };

    const placeholder = normalizeText(item.placeholder);
    if (placeholder.length > 120) return { value: null, error: "지원서 추가 질문 안내문은 120자 이하로 입력해야 합니다" };

    const options = normalizeOptions(item.options);
    if (type === "select" && (options.length < 2 || options.length > 10)) {
      return { value: null, error: "선택형 질문은 2개 이상 10개 이하의 선택지가 필요합니다" };
    }
    if (options.some((option) => option.length > 80)) {
      return { value: null, error: "선택지는 80자 이하로 입력해야 합니다" };
    }

    questions.push({
      id: normalizeQuestionId(item.id, index, usedIds),
      label,
      type,
      required: Boolean(item.required),
      options: type === "select" ? options : [],
      placeholder: placeholder || null,
    });
  }

  return { value: questions, error: null };
}

export function validateAndNormalizeApplicationAnswers(
  questionsInput: unknown,
  answersInput: unknown
): { value: ApplicationAnswers | null; error: string | null } {
  const questionResult = validateAndNormalizeApplicationQuestions(questionsInput);
  if (questionResult.error || !questionResult.value) {
    return { value: null, error: questionResult.error ?? "지원서 질문 설정이 올바르지 않습니다" };
  }

  if (!isRecord(answersInput)) {
    return questionResult.value.some((question) => question.required)
      ? { value: null, error: "추가 질문 답변을 입력해주세요" }
      : { value: {}, error: null };
  }

  const answers: ApplicationAnswers = {};
  for (const question of questionResult.value) {
    const answer = normalizeText(answersInput[question.id]);
    if (question.required && !answer) {
      return { value: null, error: `${question.label} 답변을 입력해주세요` };
    }
    if (!answer) continue;

    const maxLength =
      question.type === "long_text" ? applicationAnswerLongMaxLength : applicationAnswerShortMaxLength;
    if (answer.length > maxLength) {
      return { value: null, error: `${question.label} 답변은 ${maxLength}자 이하로 입력해야 합니다` };
    }
    if (question.type === "select" && !(question.options ?? []).includes(answer)) {
      return { value: null, error: `${question.label} 선택지가 올바르지 않습니다` };
    }
    answers[question.id] = answer;
  }

  return { value: answers, error: null };
}

export function formatApplicationAnswersForDisplay(
  answersInput: unknown,
  questionsInput: unknown = []
) {
  if (!isRecord(answersInput)) return "";
  const questions = validateAndNormalizeApplicationQuestions(questionsInput).value ?? [];
  const labels = new Map(questions.map((question) => [question.id, question.label]));
  return Object.entries(answersInput)
    .filter(([, value]) => typeof value === "string" && value.trim())
    .map(([key, value]) => `${labels.get(key) ?? key}: ${String(value).trim()}`)
    .join("\n");
}
