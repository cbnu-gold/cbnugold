import type { SiteSettingsValue } from "@/types";
import { isHttpsUrl, isSafeCmsHref } from "@/lib/cms-links";

type SiteSettingFieldKind = "text" | "email" | "phone" | "internal-or-https" | "optional-https";

export const siteSettingFields = [
  { key: "site_title", label: "사이트 제목", kind: "text", maxLength: 60, required: true },
  { key: "club_name", label: "동아리명", kind: "text", maxLength: 100, required: true },
  { key: "hero_title", label: "홈 첫 문장", kind: "text", maxLength: 100, required: true },
  { key: "hero_subtitle", label: "홈 설명", kind: "text", maxLength: 240, required: true },
  { key: "primary_cta_label", label: "주요 CTA 문구", kind: "text", maxLength: 40, required: true },
  { key: "primary_cta_href", label: "주요 CTA 링크", kind: "internal-or-https", maxLength: 300, required: true },
  { key: "secondary_cta_label", label: "보조 CTA 문구", kind: "text", maxLength: 40, required: true },
  { key: "secondary_cta_href", label: "보조 CTA 링크", kind: "internal-or-https", maxLength: 300, required: true },
  { key: "contact_name", label: "문의 담당", kind: "text", maxLength: 80, required: true },
  { key: "contact_phone", label: "문의 전화", kind: "phone", maxLength: 30, required: true },
  { key: "contact_email", label: "문의 이메일", kind: "email", maxLength: 120, required: true },
  { key: "instagram_url", label: "인스타그램 URL", kind: "optional-https", maxLength: 300, required: false },
  { key: "naver_cafe_url", label: "네이버 카페 URL", kind: "optional-https", maxLength: 300, required: false },
] as const satisfies readonly {
  key: keyof SiteSettingsValue;
  label: string;
  kind: SiteSettingFieldKind;
  maxLength: number;
  required: boolean;
}[];

const knownSettingKeys = new Set(siteSettingFields.map((field) => field.key));
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+\-()\s]{8,30}$/;
const controlCharacterPattern = /[\u0000-\u001F\u007F]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateFieldValue(kind: SiteSettingFieldKind, value: string) {
  if (kind === "email") return emailPattern.test(value);
  if (kind === "phone") return phonePattern.test(value);
  if (kind === "internal-or-https") return isSafeCmsHref(value);
  if (kind === "optional-https") return value === "" || isHttpsUrl(value);
  return true;
}

function fieldFormatMessage(kind: SiteSettingFieldKind, label: string) {
  if (kind === "email") return `${label} 형식이 올바르지 않습니다`;
  if (kind === "phone") return `${label} 형식이 올바르지 않습니다`;
  if (kind === "internal-or-https") return `${label}는 사이트 내부 경로 또는 https URL만 사용할 수 있습니다`;
  if (kind === "optional-https") return `${label}은 https URL만 사용할 수 있습니다`;
  return `${label} 형식이 올바르지 않습니다`;
}

export function validateAndNormalizeSiteSettingsValue(value: unknown): {
  value: SiteSettingsValue | null;
  error: string | null;
} {
  if (!isRecord(value)) {
    return { value: null, error: "사이트 설정값은 객체 형식이어야 합니다" };
  }

  const unknownKeys = Object.keys(value).filter((key) => !knownSettingKeys.has(key as keyof SiteSettingsValue));
  if (unknownKeys.length > 0) {
    return { value: null, error: `지원하지 않는 설정 항목입니다: ${unknownKeys.join(", ")}` };
  }

  const normalized = {} as SiteSettingsValue;
  for (const field of siteSettingFields) {
    const raw = value[field.key];
    if (typeof raw !== "string") {
      return { value: null, error: `${field.label} 값은 문자열이어야 합니다` };
    }

    const text = raw.trim();
    if (field.required && !text) {
      return { value: null, error: `${field.label} 값이 필요합니다` };
    }
    if (text.length > field.maxLength) {
      return { value: null, error: `${field.label}은 ${field.maxLength}자 이하로 입력해야 합니다` };
    }
    if (controlCharacterPattern.test(text)) {
      return { value: null, error: `${field.label}에 제어 문자를 사용할 수 없습니다` };
    }
    if (!validateFieldValue(field.kind, text)) {
      return { value: null, error: fieldFormatMessage(field.kind, field.label) };
    }

    normalized[field.key] = text;
  }

  return { value: normalized, error: null };
}
