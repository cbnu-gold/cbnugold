const controlCharacterPattern = /[\u0000-\u001F\u007F]/;

export function isSafeInternalPath(value: string) {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/\s/.test(value) &&
    !controlCharacterPattern.test(value)
  );
}

export function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function isSafeCmsHref(value: string) {
  return isSafeInternalPath(value) || isHttpsUrl(value);
}

export function normalizeOptionalCmsHref(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return isSafeCmsHref(trimmed) ? trimmed : null;
}

export function getOptionalCmsHrefError(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return `${label} 값은 문자열이어야 합니다`;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isSafeCmsHref(trimmed)) {
    return `${label}는 사이트 내부 경로 또는 https URL만 사용할 수 있습니다`;
  }

  return null;
}
