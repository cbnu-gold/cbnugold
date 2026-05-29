type CmsPayload = Record<string, unknown>;
type ValidationMode = "insert" | "update";

const slugPattern = /^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;
const keyPattern = /^[a-z0-9_-]+$/;
const activityCategoryPattern = /^[a-z0-9_-]+$/;
const mediaKinds = new Set(["image", "document"]);

function shouldValidate(payload: CmsPayload, key: string, mode: ValidationMode, required = false) {
  return key in payload || (mode === "insert" && required);
}

function validateText(
  payload: CmsPayload,
  key: string,
  label: string,
  mode: ValidationMode,
  {
    required = false,
    maxLength = 160,
    pattern,
    patternMessage,
    nullable = true,
  }: {
    required?: boolean;
    maxLength?: number;
    pattern?: RegExp;
    patternMessage?: string;
    nullable?: boolean;
  } = {}
) {
  if (!shouldValidate(payload, key, mode, required)) return null;

  const raw = payload[key];
  if (raw === null || raw === undefined) {
    if (required || !nullable) return `${label} 값이 필요합니다`;
    payload[key] = null;
    return null;
  }
  if (typeof raw !== "string") return `${label} 값은 문자열이어야 합니다`;

  const value = raw.trim();
  if (required && !value) return `${label} 값이 필요합니다`;
  if (value.length > maxLength) return `${label}은 ${maxLength}자 이하로 입력해야 합니다`;
  if (pattern && value && !pattern.test(value)) return patternMessage ?? `${label} 형식이 올바르지 않습니다`;

  payload[key] = value || null;
  return null;
}

function validateInteger(
  payload: CmsPayload,
  key: string,
  label: string,
  mode: ValidationMode,
  {
    required = false,
    nullable = false,
    min = 0,
    max = 9999,
  }: {
    required?: boolean;
    nullable?: boolean;
    min?: number;
    max?: number;
  } = {}
) {
  if (!shouldValidate(payload, key, mode, required)) return null;

  const raw = payload[key];
  if ((raw === null || raw === "") && nullable) {
    payload[key] = null;
    return null;
  }

  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    return `${label}은 ${min} 이상 ${max} 이하의 정수여야 합니다`;
  }

  payload[key] = value;
  return null;
}

function validateBoolean(payload: CmsPayload, key: string, label: string) {
  if (!(key in payload)) return null;
  if (typeof payload[key] !== "boolean") return `${label} 값은 true 또는 false여야 합니다`;
  return null;
}

function validateStringArray(
  payload: CmsPayload,
  key: string,
  label: string,
  mode: ValidationMode,
  { maxItems = 20, maxLength = 120 }: { maxItems?: number; maxLength?: number } = {}
) {
  if (!shouldValidate(payload, key, mode)) return null;
  const raw = payload[key];
  if (!Array.isArray(raw)) return `${label}은 배열 형식이어야 합니다`;

  const values: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") return `${label}은 문자열만 입력할 수 있습니다`;
    const value = item.trim();
    if (value) values.push(value);
  }

  if (values.length > maxItems) return `${label}은 ${maxItems}개 이하로 입력해야 합니다`;
  if (values.some((value) => value.length > maxLength)) {
    return `${label} 항목은 ${maxLength}자 이하로 입력해야 합니다`;
  }

  payload[key] = values;
  return null;
}

function validateSortOrder(payload: CmsPayload, mode: ValidationMode) {
  return validateInteger(payload, "sort_order", "순서", mode, { required: true, min: 0, max: 10000 });
}

function firstError(...errors: (string | null)[]) {
  return errors.find(Boolean) ?? null;
}

export function validateAndNormalizeCmsResourcePayload(
  resource: string,
  payload: CmsPayload,
  mode: ValidationMode
) {
  if (resource === "pages") {
    return firstError(
      validateText(payload, "slug", "페이지 슬러그", mode, {
        required: true,
        maxLength: 80,
        pattern: slugPattern,
        patternMessage: "페이지 슬러그는 영문 소문자, 숫자, 하이픈, 슬래시만 사용할 수 있습니다",
        nullable: false,
      }),
      validateText(payload, "title", "페이지 제목", mode, { required: true, maxLength: 100, nullable: false }),
      validateText(payload, "description", "페이지 설명", mode, { maxLength: 240 }),
      validateSortOrder(payload, mode)
    );
  }

  if (resource === "blocks") {
    return firstError(
      validateText(payload, "page_slug", "블록 페이지", mode, {
        required: true,
        maxLength: 80,
        pattern: slugPattern,
        patternMessage: "블록 페이지는 영문 소문자, 숫자, 하이픈, 슬래시만 사용할 수 있습니다",
        nullable: false,
      }),
      validateText(payload, "block_key", "블록 키", mode, {
        required: true,
        maxLength: 80,
        pattern: keyPattern,
        patternMessage: "블록 키는 영문 소문자, 숫자, 하이픈, 밑줄만 사용할 수 있습니다",
        nullable: false,
      }),
      validateText(payload, "title", "블록 제목", mode, { maxLength: 120 }),
      validateText(payload, "subtitle", "블록 부제목", mode, { maxLength: 160 }),
      validateText(payload, "body", "블록 본문", mode, { maxLength: 2000 }),
      validateText(payload, "cta_label", "CTA 문구", mode, { maxLength: 60 }),
      validateSortOrder(payload, mode)
    );
  }

  if (resource === "activities") {
    return firstError(
      validateText(payload, "title", "활동 제목", mode, { required: true, maxLength: 120, nullable: false }),
      validateText(payload, "subtitle", "활동 부제목", mode, { maxLength: 160 }),
      validateText(payload, "description", "활동 설명", mode, { required: true, maxLength: 1200, nullable: false }),
      validateText(payload, "category", "활동 분류", mode, {
        required: true,
        maxLength: 40,
        pattern: activityCategoryPattern,
        patternMessage: "활동 분류는 영문 소문자, 숫자, 하이픈, 밑줄만 사용할 수 있습니다",
        nullable: false,
      }),
      validateStringArray(payload, "tags", "활동 태그", mode, { maxItems: 12, maxLength: 40 }),
      validateSortOrder(payload, mode)
    );
  }

  if (resource === "achievements") {
    return firstError(
      validateText(payload, "title", "성과 제목", mode, { required: true, maxLength: 120, nullable: false }),
      validateText(payload, "organization", "성과 기관/분야", mode, { maxLength: 80 }),
      validateText(payload, "result", "성과 결과", mode, { required: true, maxLength: 120, nullable: false }),
      validateInteger(payload, "year", "성과 연도", mode, { nullable: true, min: 1900, max: 2100 }),
      validateSortOrder(payload, mode)
    );
  }

  if (resource === "history") {
    return firstError(
      validateInteger(payload, "year", "연혁 연도", mode, { required: true, min: 1900, max: 2100 }),
      validateInteger(payload, "generation", "연혁 기수", mode, { nullable: true, min: 1, max: 99 }),
      validateText(payload, "president", "회장", mode, { maxLength: 80 }),
      validateStringArray(payload, "milestones", "연혁 마일스톤", mode, { maxItems: 20, maxLength: 160 }),
      validateBoolean(payload, "is_current", "현재 기수"),
      validateSortOrder(payload, mode)
    );
  }

  if (resource === "faqs") {
    return firstError(
      validateText(payload, "question", "FAQ 질문", mode, { required: true, maxLength: 160, nullable: false }),
      validateText(payload, "answer", "FAQ 답변", mode, { required: true, maxLength: 1200, nullable: false }),
      validateSortOrder(payload, mode)
    );
  }

  if (resource === "media") {
    if ("kind" in payload && typeof payload.kind === "string" && !mediaKinds.has(payload.kind)) {
      return "미디어 분류값이 올바르지 않습니다";
    }
    return validateText(payload, "alt", "대체 텍스트/설명", mode, { maxLength: 200 });
  }

  return null;
}
