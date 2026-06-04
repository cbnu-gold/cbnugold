export interface CmsMediaReferenceTarget {
  bucket: string;
  path: string;
  public_url: string | null;
}

export interface CmsMediaReference {
  source: "content_blocks" | "recruitment_cycles" | "site_settings";
  field: string;
  label: string;
  status?: string | null;
  href: string;
}

interface ContentBlockReferenceRow {
  page_slug: string | null;
  block_key: string | null;
  title: string | null;
  status: string | null;
  media_url: string | null;
}

interface RecruitmentReferenceRow {
  generation: number | null;
  title: string | null;
  status: string | null;
  docx_url: string | null;
  hwp_url: string | null;
}

interface SiteSettingReferenceRow {
  key: string | null;
  status: string | null;
  value: unknown;
}

export interface CmsMediaReferenceRows {
  blocks?: ContentBlockReferenceRow[] | null;
  recruitment?: RecruitmentReferenceRow[] | null;
  settings?: SiteSettingReferenceRow[] | null;
}

function addCandidate(candidates: Set<string>, value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return;

  candidates.add(trimmed);
  try {
    const url = new URL(trimmed);
    candidates.add(`${url.origin}${url.pathname}`);
    candidates.add(url.pathname);
  } catch {
    // Internal paths and storage paths are handled as plain strings.
  }
}

function getDecodedPathname(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function buildCmsMediaReferenceCandidates(target: CmsMediaReferenceTarget) {
  const candidates = new Set<string>();
  const storagePath = `/storage/v1/object/public/${target.bucket}/${target.path}`;

  addCandidate(candidates, target.public_url);
  addCandidate(candidates, target.path);
  addCandidate(candidates, `${target.bucket}/${target.path}`);
  addCandidate(candidates, `/${target.bucket}/${target.path}`);
  addCandidate(candidates, storagePath);

  return [...candidates];
}

export function isCmsMediaReferenceValue(value: unknown, target: CmsMediaReferenceTarget) {
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (!trimmed) return false;

  const candidates = new Set(buildCmsMediaReferenceCandidates(target));
  if (candidates.has(trimmed)) return true;

  const storagePath = `/storage/v1/object/public/${target.bucket}/${target.path}`;
  try {
    const url = new URL(trimmed);
    const decodedPathname = getDecodedPathname(url.pathname);
    const decodedStoragePath = getDecodedPathname(storagePath);
    return decodedPathname === decodedStoragePath;
  } catch {
    return false;
  }
}

function collectSettingReferences(
  target: CmsMediaReferenceTarget,
  value: unknown,
  path: string,
  push: (field: string, href: string) => void
) {
  if (typeof value === "string") {
    if (isCmsMediaReferenceValue(value, target)) push(path, value.trim());
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectSettingReferences(target, item, `${path}[${index}]`, push));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      collectSettingReferences(target, item, `${path}.${key}`, push);
    }
  }
}

export function collectCmsMediaReferences(
  target: CmsMediaReferenceTarget,
  rows: CmsMediaReferenceRows
) {
  const references: CmsMediaReference[] = [];

  for (const block of rows.blocks ?? []) {
    if (!isCmsMediaReferenceValue(block.media_url, target)) continue;
    references.push({
      source: "content_blocks",
      field: "media_url",
      label: [block.page_slug, block.block_key].filter(Boolean).join(" / ") || block.title || "콘텐츠 블록",
      status: block.status,
      href: block.media_url ?? "",
    });
  }

  for (const cycle of rows.recruitment ?? []) {
    const label = cycle.title || (cycle.generation ? `${cycle.generation}기 모집` : "모집 설정");
    for (const field of ["docx_url", "hwp_url"] as const) {
      const href = cycle[field];
      if (!isCmsMediaReferenceValue(href, target)) continue;
      references.push({
        source: "recruitment_cycles",
        field,
        label,
        status: cycle.status,
        href: href ?? "",
      });
    }
  }

  for (const setting of rows.settings ?? []) {
    collectSettingReferences(target, setting.value, setting.key ?? "site_settings", (field, href) => {
      references.push({
        source: "site_settings",
        field,
        label: setting.key ?? "사이트 설정",
        status: setting.status,
        href,
      });
    });
  }

  return references;
}
