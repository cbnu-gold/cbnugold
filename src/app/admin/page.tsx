"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { toCsv } from "@/lib/csv";
import { applicantAdminNoteMaxLength } from "@/lib/applicant-admin";
import { getCmsMediaUploadValidationError } from "@/lib/cms-media-files";
import { buildOrganizationSiteExport } from "@/lib/organization-export";
import {
  buildContentFreshnessReport,
  buildSiteReadinessReport,
  buildSiteVerticalFitReport,
} from "@/lib/site-readiness";
import {
  organizationSiteModules,
  organizationSiteQualityGates,
  organizationSiteUseCases,
  organizationSiteVerticals,
  organizationThemePresets,
} from "@/lib/organization-site-model";
import {
  canManageAdmins as roleCanManageAdmins,
  canManageApplicants as roleCanManageApplicants,
  canViewAudit as roleCanViewAudit,
  canWriteContent,
} from "@/lib/admin-permissions";
import {
  defaultSiteSettingsValue,
  siteSettingFields,
  validateAndNormalizeSiteSettingsValue,
} from "@/lib/site-settings";
import type {
  ActivityItem,
  AdminProfile,
  Applicant,
  AuditLog,
  ContentBlock,
  ContentPage,
  FAQItem,
  AchievementItem,
  HistoryItem,
  MediaAsset,
  RecruitmentCycle,
  SiteSettingsValue,
} from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Database,
  Download,
  FileText,
  ImageUp,
  LayoutDashboard,
  Loader2,
  LogOut,
  Megaphone,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserCog,
  Users,
  X,
} from "lucide-react";

type Tab =
  | "overview"
  | "applicants"
  | "recruitment"
  | "content"
  | "activities"
  | "achievements"
  | "history"
  | "faqs"
  | "media"
  | "admins"
  | "audit";

type ResourceState = {
  applicants: Applicant[];
  settings: SiteSettingsValue;
  recruitment: RecruitmentCycle[];
  pages: ContentPage[];
  blocks: ContentBlock[];
  activities: ActivityItem[];
  achievements: AchievementItem[];
  history: HistoryItem[];
  faqs: FAQItem[];
  media: MediaAsset[];
  admins: AdminProfile[];
  audit: AuditLog[];
};

type HealthSnapshot = {
  status: "ok" | "degraded" | string;
  checkedAt?: string;
  checks?: {
    name: string;
    ok: boolean;
    message?: string;
  }[];
};

const defaultSettings: SiteSettingsValue = defaultSiteSettingsValue;

const initialState: ResourceState = {
  applicants: [],
  settings: defaultSettings,
  recruitment: [],
  pages: [],
  blocks: [],
  activities: [],
  achievements: [],
  history: [],
  faqs: [],
  media: [],
  admins: [],
  audit: [],
};

function normalizeAdminSettings(value: Partial<SiteSettingsValue> | null | undefined): SiteSettingsValue {
  return (
    validateAndNormalizeSiteSettingsValue({ ...defaultSettings, ...(value ?? {}) }).value ??
    defaultSettings
  );
}

const tabs: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "대시보드", icon: LayoutDashboard },
  { key: "applicants", label: "지원자", icon: Users },
  { key: "recruitment", label: "모집", icon: Megaphone },
  { key: "content", label: "페이지 CMS", icon: FileText },
  { key: "activities", label: "활동", icon: ClipboardList },
  { key: "achievements", label: "성과", icon: BarChart3 },
  { key: "history", label: "연혁", icon: Database },
  { key: "faqs", label: "FAQ", icon: BookOpen },
  { key: "media", label: "미디어", icon: ImageUp },
  { key: "admins", label: "관리자", icon: UserCog },
  { key: "audit", label: "감사 로그", icon: ShieldCheck },
];

const statusLabels: Record<string, string> = {
  pending: "대기",
  reviewed: "검토완료",
  interview: "면접",
  accepted: "합격",
  rejected: "불합격",
};

const applicantStatusOptions = Object.entries(statusLabels).map(([value, label]) => ({ value, label }));

const contentStatusOptions = [
  { value: "draft", label: "초안" },
  { value: "published", label: "게시" },
  { value: "archived", label: "보관" },
];

const achievementKindOptions = [
  { value: "placement", label: "취업·인턴" },
  { value: "award", label: "수상·외부활동" },
  { value: "metric", label: "지표" },
];

const adminRoleOptions = [
  { value: "owner", label: "소유자" },
  { value: "admin", label: "관리자" },
  { value: "editor", label: "편집자" },
  { value: "viewer", label: "조회자" },
];

const blockGuideItems = [
  { page: "home", key: "hero", label: "홈 첫 화면", note: "제목, 설명, CTA, 키비주얼" },
  { page: "home", key: "philosophy", label: "홈 운영 철학", note: "제목: 설명 형식, 최대 3줄" },
  { page: "home", key: "proof", label: "홈 2025년 성과", note: "성과 목록 섹션 안내" },
  { page: "join", key: "first-semester", label: "지원 첫 학기 흐름", note: "합류 후 활동 순서 3단계" },
  { page: "about", key: "intro", label: "소개 상단 문구", note: "동아리 소개 첫 문단" },
  { page: "about", key: "partners", label: "소개 협력 정보", note: "소속 및 협력 안내" },
  { page: "activity", key: "intro", label: "활동 상단 문구", note: "정기·특별 활동 소개" },
];

function joinList(value: string[] | null | undefined) {
  return (value ?? []).join("\n");
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toDatetimeLocal(value: string | null | undefined) {
  return value?.slice(0, 16) ?? "";
}

function fromDatetimeLocal(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function getSettingInputType(key: keyof SiteSettingsValue) {
  if (key === "contact_email") return "email";
  if (key === "contact_phone") return "tel";
  if (key === "instagram_url" || key === "naver_cafe_url") return "url";
  if (key === "logo_url" || key === "share_image_url") return "text";
  return "text";
}

function getSettingHint(key: keyof SiteSettingsValue) {
  if (key === "primary_cta_href" || key === "secondary_cta_href") {
    return "예: /join 또는 https://forms.gle/...";
  }
  if (key === "instagram_url" || key === "naver_cafe_url") {
    return "외부 채널은 https URL만 저장됩니다. 비워두면 공개 화면에서 숨겨집니다.";
  }
  if (key === "logo_url") return "예: /images/logo.svg 또는 CMS 미디어 https URL";
  if (key === "share_image_url") return "검색·SNS 공유와 홈 키비주얼 기본 이미지에 사용됩니다.";
  if (key === "organization_type") return "예: 금융권 취업 동아리, 투자 학회, 창업팀";
  if (key === "founded_label") return "예: Est. 2021, Since 2024";
  if (key === "brand_statement") return "짧은 운영 철학입니다. 자평 문구보다 행동 기준으로 작성합니다.";
  if (key === "contact_phone") return "하이픈 포함 입력 가능";
  return undefined;
}

function getActionErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getAdminApiErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;

  const body = data as { error?: unknown; references?: unknown };
  const message = typeof body.error === "string" && body.error.trim() ? body.error : fallback;
  if (!Array.isArray(body.references) || body.references.length === 0) return message;

  const references = body.references
    .map((reference) => {
      if (!reference || typeof reference !== "object") return null;
      const item = reference as { label?: unknown; field?: unknown; status?: unknown };
      const label = typeof item.label === "string" && item.label.trim() ? item.label.trim() : "연결 항목";
      const field = typeof item.field === "string" && item.field.trim() ? item.field.trim() : "URL";
      const status = typeof item.status === "string" && item.status.trim() ? `, ${item.status.trim()}` : "";
      return `- ${label} (${field}${status})`;
    })
    .filter(Boolean)
    .slice(0, 5);

  return references.length > 0 ? `${message}\n${references.join("\n")}` : message;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  hint,
}: {
  label: string;
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
      />
      {hint && <span className="text-xs leading-5 text-slate-500">{hint}</span>}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <textarea
        rows={rows}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
      />
    </label>
  );
}

function AdminButton({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const styles = {
    primary: "bg-ink text-white hover:bg-navy-800",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:border-slate-300",
    danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

function formatAdminFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [token, setToken] = useState("");
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [state, setState] = useState<ResourceState>(initialState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAlt, setUploadAlt] = useState("");
  const [applicantSearch, setApplicantSearch] = useState("");
  const [applicantStatusFilter, setApplicantStatusFilter] = useState("all");
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState("");
  const router = useRouter();
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadFileErrorId = useId();

  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  }

  async function adminFetch(path: string, init: RequestInit = {}) {
    const response = await fetch(path, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`,
        ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(getAdminApiErrorMessage(data, "요청 처리에 실패했습니다"));
    return data;
  }

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError("");
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as HealthSnapshot | null;
      if (!data || ![200, 503].includes(response.status)) {
        throw new Error("운영 상태를 불러오지 못했습니다.");
      }
      setHealth(data);
    } catch (loadError) {
      setHealthError(loadError instanceof Error ? loadError.message : "운영 상태를 불러오지 못했습니다.");
    } finally {
      setHealthLoading(false);
    }
  }, []);

  async function loadAll(activeToken: string) {
    setLoading(true);
    setError("");

    const fetchWithToken = async (path: string) => {
      const response = await fetch(path, { headers: { Authorization: `Bearer ${activeToken}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "관리자 데이터를 불러오지 못했습니다");
      return data;
    };

    const me = await fetchWithToken("/api/admin/me");
    const activeRole = (me.admin as AdminProfile | undefined)?.role;
    const canLoadApplicants = roleCanManageApplicants(activeRole);
    const canLoadAdmins = roleCanManageAdmins(activeRole);
    const canLoadAudit = roleCanViewAudit(activeRole);

    const [applicants, settings, recruitment, pages, blocks, activities, achievements, history, faqs, media, admins, audit] =
      await Promise.all([
        canLoadApplicants ? fetchWithToken("/api/admin/applicants") : Promise.resolve({ applicants: [] }),
        fetchWithToken("/api/admin/cms/settings"),
        fetchWithToken("/api/admin/cms/recruitment"),
        fetchWithToken("/api/admin/cms/pages"),
        fetchWithToken("/api/admin/cms/blocks"),
        fetchWithToken("/api/admin/cms/activities"),
        fetchWithToken("/api/admin/cms/achievements"),
        fetchWithToken("/api/admin/cms/history"),
        fetchWithToken("/api/admin/cms/faqs"),
        fetchWithToken("/api/admin/cms/media"),
        canLoadAdmins ? fetchWithToken("/api/admin/cms/admins") : Promise.resolve({ items: [] }),
        canLoadAudit ? fetchWithToken("/api/admin/cms/audit") : Promise.resolve({ items: [] }),
      ]);

    setAdmin(me.admin);
    setState({
      applicants: applicants.applicants ?? [],
      settings: normalizeAdminSettings(settings.items?.[0]?.value),
      recruitment: recruitment.items ?? [],
      pages: pages.items ?? [],
      blocks: blocks.items ?? [],
      activities: activities.items ?? [],
      achievements: achievements.items ?? [],
      history: history.items ?? [],
      faqs: faqs.items ?? [],
      media: media.items ?? [],
      admins: admins.items ?? [],
      audit: audit.items ?? [],
    });
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        router.push("/admin/login");
        return;
      }

      setToken(accessToken);
      try {
        await loadAll(accessToken);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "관리자 데이터를 불러오지 못했습니다");
        setLoading(false);
      }
    }

    init();
  }, [router]);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  const applicantCounts = useMemo(() => {
    return state.applicants.reduce<Record<string, number>>((acc, applicant) => {
      acc[applicant.status] = (acc[applicant.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [state.applicants]);

  const filteredApplicants = useMemo(() => {
    const query = applicantSearch.trim().toLowerCase();
    return state.applicants.filter((applicant) => {
      const matchesStatus =
        applicantStatusFilter === "all" || applicant.status === applicantStatusFilter;
      const haystack = [
        applicant.name,
        applicant.student_id,
        applicant.email,
        applicant.phone,
        applicant.admin_note ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!query || haystack.includes(query));
    });
  }, [applicantSearch, applicantStatusFilter, state.applicants]);

  const role = admin?.role;
  const canWrite = canWriteContent(role);
  const canHandleApplicants = roleCanManageApplicants(role);
  const canManageAdminAccounts = roleCanManageAdmins(role);
  const canReadAudit = roleCanViewAudit(role);
  const failedHealthChecks = health?.checks?.filter((check) => !check.ok) ?? [];
  const readiness = useMemo(
    () =>
      buildSiteReadinessReport({
        settings: state.settings,
        recruitment: state.recruitment,
        pages: state.pages,
        blocks: state.blocks,
        activities: state.activities,
        achievements: state.achievements,
        faqs: state.faqs,
        media: state.media,
        admins: state.admins,
        canVerifyAdmins: canManageAdminAccounts,
      }),
    [canManageAdminAccounts, state]
  );
  const freshness = useMemo(
    () =>
      buildContentFreshnessReport({
        settings: state.settings,
        recruitment: state.recruitment,
        pages: state.pages,
        blocks: state.blocks,
        activities: state.activities,
        achievements: state.achievements,
        faqs: state.faqs,
        media: state.media,
        admins: state.admins,
        canVerifyAdmins: canManageAdminAccounts,
      }),
    [canManageAdminAccounts, state]
  );
  const verticalFit = useMemo(
    () =>
      buildSiteVerticalFitReport({
        settings: state.settings,
        recruitment: state.recruitment,
        pages: state.pages,
        blocks: state.blocks,
        activities: state.activities,
        achievements: state.achievements,
        faqs: state.faqs,
        media: state.media,
        admins: state.admins,
        canVerifyAdmins: canManageAdminAccounts,
      }),
    [canManageAdminAccounts, state]
  );
  const uploadFileError = uploadFile
    ? getCmsMediaUploadValidationError(uploadFile.name, uploadFile.type, uploadFile.size)
    : "";
  const visibleTabs = useMemo(
    () =>
      tabs.filter((item) => {
        if (item.key === "applicants") return canHandleApplicants;
        if (item.key === "admins") return canManageAdminAccounts;
        if (item.key === "audit") return canReadAudit;
        return true;
      }),
    [canHandleApplicants, canManageAdminAccounts, canReadAudit]
  );

  useEffect(() => {
    if (!visibleTabs.some((item) => item.key === tab)) setTab("overview");
  }, [tab, visibleTabs]);

  async function logout() {
    await getSupabase().auth.signOut();
    router.push("/admin/login");
  }

  function requireWrite(action = "수정") {
    if (canWrite) return true;
    setMessage("");
    setError(`조회자 권한은 ${action}할 수 없습니다.`);
    return false;
  }

  function requireOwner(action = "관리자 계정 관리") {
    if (canManageAdminAccounts) return true;
    setMessage("");
    setError(`${action}에는 소유자 권한이 필요합니다.`);
    return false;
  }

  function requireApplicantAccess(action = "지원자 관리") {
    if (canHandleApplicants) return true;
    setMessage("");
    setError(`${action}에는 관리자 권한이 필요합니다.`);
    return false;
  }

  async function saveSettings() {
    if (!requireWrite("사이트 설정 저장")) return;
    setSaving("settings");
    setMessage("");
    setError("");
    try {
      await adminFetch("/api/admin/cms/settings", {
        method: "PATCH",
        body: JSON.stringify({ key: "site", values: { value: state.settings, status: "published" } }),
      });
      setMessage("사이트 설정을 저장했습니다.");
    } catch (saveError) {
      setError(getActionErrorMessage(saveError, "사이트 설정 저장에 실패했습니다."));
    } finally {
      setSaving("");
    }
  }

  async function saveItem(resource: string, item: Record<string, unknown>, forceCreate = false) {
    if (resource === "admins" ? !requireOwner() : !requireWrite("콘텐츠 저장")) return null;
    setSaving(resource);
    setMessage("");
    setError("");
    try {
      const method = item.id && !forceCreate ? "PATCH" : "POST";
      const body = method === "PATCH" ? { id: item.id, values: item } : item;
      const data = await adminFetch(`/api/admin/cms/${resource}`, {
        method,
        body: JSON.stringify(body),
      });
      setMessage("저장했습니다.");
      return data.item;
    } catch (saveError) {
      setError(getActionErrorMessage(saveError, "저장에 실패했습니다."));
      return null;
    } finally {
      setSaving("");
    }
  }

  async function saveItemAndReload(resource: string, item: Record<string, unknown>, forceCreate = false) {
    const saved = await saveItem(resource, item, forceCreate);
    if (saved) await loadAll(token);
  }

  async function deleteItem(resource: string, id?: string) {
    if (!id) return;
    if (resource === "admins" ? !requireOwner() : !requireWrite("삭제")) return;
    const confirmed = window.confirm("이 항목을 삭제할까요? 공개 페이지와 관리자 목록에서 즉시 제거될 수 있습니다.");
    if (!confirmed) return;
    setSaving(resource);
    setMessage("");
    setError("");
    try {
      await adminFetch(`/api/admin/cms/${resource}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setMessage("삭제했습니다.");
      await loadAll(token);
    } catch (deleteError) {
      setError(getActionErrorMessage(deleteError, "삭제에 실패했습니다."));
    } finally {
      setSaving("");
    }
  }

  async function updateApplicant(id: string, values: Partial<Applicant>) {
    if (!requireApplicantAccess("지원자 정보 수정")) return;
    setMessage("");
    setError("");
    try {
      const data = await adminFetch("/api/admin/applicants", {
        method: "PATCH",
        body: JSON.stringify({ id, ...values }),
      });
      setState((prev) => ({
        ...prev,
        applicants: prev.applicants.map((item) => (item.id === id ? data.applicant : item)),
      }));
      setMessage("지원자 정보를 저장했습니다.");
    } catch (updateError) {
      setError(getActionErrorMessage(updateError, "지원자 정보 저장에 실패했습니다."));
    }
  }

  function downloadApplicants() {
    if (!requireApplicantAccess("지원자 CSV 다운로드")) return;
    const confirmed = window.confirm(
      `지원자 CSV에는 이름, 연락처, 관리자 메모 등 개인정보가 포함됩니다.\n현재 필터 결과 ${filteredApplicants.length}명만 내려받습니다.`
    );
    if (!confirmed) return;

    const headers = ["이름", "학번", "이메일", "전화번호", "상태", "점수", "관리자 메모", "접수일"];
    const rows = filteredApplicants.map((applicant) => [
      applicant.name,
      applicant.student_id,
      applicant.email,
      applicant.phone,
      statusLabels[applicant.status] ?? applicant.status,
      applicant.review_score ?? "",
      applicant.admin_note ?? "",
      applicant.applied_at ? new Date(applicant.applied_at).toLocaleString("ko-KR") : "",
    ]);
    const blob = new Blob(["\uFEFF" + toCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `금은동_지원자_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function downloadOrganizationSiteExport() {
    const exportData = buildOrganizationSiteExport({
      settings: state.settings,
      pages: state.pages,
      blocks: state.blocks,
      recruitment: state.recruitment,
      activities: state.activities,
      achievements: state.achievements,
      history: state.history,
      faqs: state.faqs,
      media: state.media,
    });
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${state.settings.site_title}_CMS_운영패키지_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function uploadMedia() {
    if (!requireWrite("미디어 업로드")) return;
    if (!uploadFile) {
      setError("업로드할 파일을 선택해주세요.");
      return;
    }
    const fileError = getCmsMediaUploadValidationError(uploadFile.name, uploadFile.type, uploadFile.size);
    if (fileError) {
      setError(fileError);
      return;
    }
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("alt", uploadAlt);
    setSaving("media");
    setMessage("");
    setError("");
    try {
      await adminFetch("/api/admin/media/upload", { method: "POST", body: formData });
      setUploadFile(null);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
      setUploadAlt("");
      setMessage("미디어를 업로드했습니다.");
      await loadAll(token);
    } catch (uploadError) {
      setError(getActionErrorMessage(uploadError, "미디어 업로드에 실패했습니다."));
    } finally {
      setSaving("");
    }
  }

  function clearUploadFile() {
    setUploadFile(null);
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  }

  async function updateMedia(id: string | undefined, values: Partial<MediaAsset>) {
    if (!id) return;
    if (!requireWrite("미디어 수정")) return;
    setMessage("");
    setError("");
    try {
      const data = await adminFetch(`/api/admin/media/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      setState((prev) => ({
        ...prev,
        media: prev.media.map((item) => (item.id === id ? data.item : item)),
      }));
      setMessage("미디어 정보를 저장했습니다.");
    } catch (updateError) {
      setError(getActionErrorMessage(updateError, "미디어 정보 저장에 실패했습니다."));
    }
  }

  async function copyMediaUrl(url: string | null | undefined) {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("미디어 URL을 복사했습니다.");
    } catch {
      setError("브라우저에서 클립보드 복사를 허용하지 않았습니다. 열기 버튼으로 URL을 확인해주세요.");
    }
  }

  async function deleteMedia(item: MediaAsset) {
    if (!item.id) return;
    if (!requireWrite("미디어 삭제")) return;
    const confirmed = window.confirm("스토리지 파일과 미디어 기록을 함께 삭제할까요?");
    if (!confirmed) return;
    setMessage("");
    setError("");
    try {
      await adminFetch(`/api/admin/media/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      setState((prev) => ({
        ...prev,
        media: prev.media.filter((media) => media.id !== item.id),
      }));
      setMessage("미디어를 삭제했습니다.");
    } catch (deleteError) {
      setError(getActionErrorMessage(deleteError, "미디어 삭제에 실패했습니다."));
    }
  }

  function updateList<K extends keyof ResourceState>(key: K, next: ResourceState[K]) {
    setState((prev) => ({ ...prev, [key]: next }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 text-slate-900">
      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-6 lg:grid-cols-[250px_1fr] lg:gap-6 lg:px-8 lg:py-8">
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="px-3 py-4">
            <p className="text-xs font-semibold text-gold-dark">CBNU GOLD Admin</p>
            <h1 className="mt-2 text-xl font-bold text-slate-950">운영 대시보드</h1>
            {admin && <p className="mt-1 text-xs text-slate-500">{admin.email} · {admin.role}</p>}
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:gap-1 lg:overflow-visible lg:pb-0">
            {visibleTabs.map((item) => {
              const Icon = item.icon;
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-left text-sm font-medium transition lg:rounded-lg ${
                    active ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <AdminButton variant="secondary" onClick={logout}>
              <LogOut className="h-4 w-4" />
              로그아웃
            </AdminButton>
          </div>
        </aside>

        <main className="grid gap-5">
          {(message || error) && (
            <div
              className={`whitespace-pre-line rounded-xl border px-4 py-3 text-sm ${
                error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {error || message}
            </div>
          )}

          {!canWrite && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              현재 계정은 조회자 권한입니다. 콘텐츠, 지원자, 미디어, 관리자 설정은 저장하거나 삭제할 수 없습니다.
            </div>
          )}

          {tab === "overview" && (
            <section className="grid gap-4 lg:grid-cols-4">
              {[
                ["전체 지원자", canHandleApplicants ? state.applicants.length : "권한 필요"],
                ["대기", canHandleApplicants ? (applicantCounts.pending ?? 0) : "권한 필요"],
                ["면접", canHandleApplicants ? (applicantCounts.interview ?? 0) : "권한 필요"],
                ["게시 콘텐츠", state.pages.length + state.blocks.length + state.activities.length],
                ["관리자 계정", canManageAdminAccounts ? state.admins.length : "권한 필요"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className={`mt-2 font-bold tabular-nums ${typeof value === "number" ? "text-3xl" : "text-xl"}`}>
                    {value}
                  </p>
                </div>
              ))}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-bold">단체 CMS 운영 패키지</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                      공개 CMS 설정, 페이지, 활동, 성과, 연혁, FAQ, 미디어 메타데이터를 JSON으로 내려받습니다.
                      지원자, 관리자 계정, 감사 로그, 비공개 지원서 파일은 포함하지 않습니다.
                    </p>
                  </div>
                  <AdminButton variant="secondary" onClick={downloadOrganizationSiteExport}>
                    <Download className="h-4 w-4" />
                    운영 패키지 다운로드
                  </AdminButton>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">운영 상태</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      배포 환경, Supabase 공개 연결, 주요 자산 상태를 확인합니다.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        health?.status === "ok"
                          ? "bg-emerald-50 text-emerald-700"
                          : health
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {health?.status === "ok" ? "정상" : health ? "점검 필요" : "확인 전"}
                    </span>
                    <AdminButton variant="secondary" onClick={loadHealth} disabled={healthLoading}>
                      {healthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      새로고침
                    </AdminButton>
                  </div>
                </div>

                {healthError && (
                  <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {healthError}
                  </p>
                )}

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {[
                    ["헬스체크", health?.status === "ok" ? "정상" : health ? "점검 필요" : "확인 중"],
                    ["실패 항목", failedHealthChecks.length],
                    [
                      "마지막 확인",
                      health?.checkedAt ? new Date(health.checkedAt).toLocaleString("ko-KR") : "-",
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-slate-500">{label}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {(health?.checks ?? []).map((check) => (
                    <div
                      key={check.name}
                      className={`rounded-lg border p-3 text-sm ${
                        check.ok ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs">{check.name}</span>
                        <span className="shrink-0 text-xs font-semibold">{check.ok ? "OK" : "확인 필요"}</span>
                      </div>
                      {check.message && <p className="mt-2 leading-6">{check.message}</p>}
                    </div>
                  ))}
                  {!health?.checks?.length && (
                    <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500 md:col-span-2">
                      운영 상태를 불러오는 중입니다.
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-lg font-bold">운영 준비도</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                      공개 화면, 모집 전환, 콘텐츠 근거, 관리자 권한을 기준으로 현재 사이트 상태를 점검합니다.
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-4 py-3 text-right">
                    <p className="text-xs font-semibold text-slate-500">준비도 점수</p>
                    <p
                      className={`mt-1 text-2xl font-bold tabular-nums ${
                        readiness.status === "pass"
                          ? "text-emerald-700"
                          : readiness.status === "warning"
                            ? "text-amber-700"
                            : "text-red-700"
                      }`}
                    >
                      {readiness.score}%
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {readiness.items.map((item) => (
                    <article
                      key={item.key}
                      className={`rounded-lg border p-4 ${
                        item.status === "pass"
                          ? "border-emerald-100 bg-emerald-50"
                          : item.status === "warning"
                            ? "border-amber-200 bg-amber-50"
                            : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-bold text-slate-950">{item.title}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            item.status === "pass"
                              ? "bg-emerald-100 text-emerald-700"
                              : item.status === "warning"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.status === "pass" ? "완료" : item.status === "warning" ? "보완" : "필수"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-600">{item.detail}</p>
                      <button
                        type="button"
                        onClick={() => setTab(item.targetTab)}
                        className="mt-3 inline-flex min-h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-gold/50 hover:text-ink"
                      >
                        {item.actionLabel}
                      </button>
                    </article>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">
                <h2 className="text-lg font-bold">운영 체크포인트</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">지원서 파일은 signed URL로만 열립니다.</p>
                  <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">콘텐츠는 published 상태만 공개 페이지에 노출됩니다.</p>
                  <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">모든 주요 수정은 audit_logs에 기록됩니다.</p>
                  <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">활성 소유자 계정은 최소 1개 이상 유지됩니다.</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold">콘텐츠 최신성</h2>
                  <p className="text-sm leading-6 text-slate-500">
                    모집 상태, 핵심 페이지, 2025년 성과, FAQ, 미디어 설명을 기준으로 검토가 필요한 항목을 확인합니다.
                  </p>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {freshness.items.map((item) => (
                    <article
                      key={item.key}
                      className={`rounded-lg border p-4 ${
                        item.status === "pass"
                          ? "border-emerald-100 bg-emerald-50"
                          : item.status === "warning"
                            ? "border-amber-200 bg-amber-50"
                            : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-bold text-slate-950">{item.title}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            item.status === "pass"
                              ? "bg-emerald-100 text-emerald-700"
                              : item.status === "warning"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.status === "pass" ? "확인" : item.status === "warning" ? "검토" : "수정"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-600">{item.detail}</p>
                      <button
                        type="button"
                        onClick={() => setTab(item.targetTab)}
                        className="mt-3 inline-flex min-h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-gold/50 hover:text-ink"
                      >
                        {item.actionLabel}
                      </button>
                    </article>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold">적용 유형 준비도</h2>
                  <p className="text-sm leading-6 text-slate-500">
                    현재 CMS 데이터를 다른 단체 홈페이지로 전환할 때 어느 유형에 바로 가까운지 점검합니다.
                  </p>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {verticalFit.map((item) => (
                    <article key={item.key} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-bold text-slate-950">{item.title}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                            item.status === "pass" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {item.score}%
                        </span>
                      </div>
                      <p className="mt-3 text-xs font-semibold text-slate-500">강점</p>
                      <ul className="mt-2 grid gap-1 text-xs leading-5 text-slate-600">
                        {(item.strengths.length ? item.strengths.slice(0, 2) : ["아직 확정된 강점이 없습니다."]).map((strength) => (
                          <li key={strength}>{strength}</li>
                        ))}
                      </ul>
                      <p className="mt-3 text-xs font-semibold text-slate-500">보완</p>
                      <ul className="mt-2 grid gap-1 text-xs leading-5 text-slate-600">
                        {(item.gaps.length ? item.gaps.slice(0, 2) : ["즉시 전환 가능한 상태입니다."]).map((gap) => (
                          <li key={gap}>{gap}</li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => setTab(item.targetTab)}
                        className="mt-3 inline-flex min-h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-gold/50 hover:text-ink"
                      >
                        관련 탭 보기
                      </button>
                    </article>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold">단체형 홈페이지 운영 모델</h2>
                  <p className="text-sm leading-6 text-slate-500">
                    금은동에 적용된 CMS 구조를 다른 단체 홈페이지에도 재사용할 때 기준이 되는 운영 단위입니다.
                  </p>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {organizationSiteModules.map((item) => (
                    <article key={item.key} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-bold text-slate-950">{item.title}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-600">{item.scope}</p>
                      <p className="mt-3 border-t border-slate-200 pt-3 text-[11px] font-semibold text-slate-500">
                        {item.adminSurface}
                      </p>
                    </article>
                  ))}
                </div>
                <ul className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                  {organizationSiteQualityGates.map((item) => (
                    <li key={item} className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-sm font-bold text-slate-950">재사용 가능한 대상</p>
                    <ul className="mt-3 grid gap-2 text-sm text-slate-600">
                      {organizationSiteUseCases.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-950">테마 프리셋</p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        현재 {state.settings.brand_preset}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {organizationThemePresets.map((preset) => (
                        <div key={preset.key} className="rounded-lg bg-slate-50 p-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-4 w-4 rounded-full border border-white shadow-sm"
                              style={{ backgroundColor: preset.colors.accent }}
                              aria-hidden="true"
                            />
                            <p className="text-sm font-semibold text-slate-900">{preset.label}</p>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-500">{preset.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-sm font-bold text-slate-950">적용 분야별 운영 초점</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {organizationSiteVerticals.map((vertical) => (
                      <article key={vertical.key} className="rounded-lg bg-slate-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-950">{vertical.title}</p>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                            {vertical.cta}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-600">{vertical.primaryFlow}</p>
                        <p className="mt-2 border-t border-slate-200 pt-2 text-[11px] leading-5 text-slate-500">
                          {vertical.coreContent}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {tab === "applicants" && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">지원자 관리</h2>
                  <p className="text-sm text-slate-500">
                    CSV에는 개인정보가 포함됩니다. 현재 필터 결과 {filteredApplicants.length}명만 내려받습니다.
                  </p>
                </div>
                <AdminButton onClick={downloadApplicants} disabled={!canHandleApplicants}>
                  <Download className="h-4 w-4" />
                  CSV 다운로드
                </AdminButton>
              </div>
              <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-[1fr_220px]">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-slate-700">검색</span>
                  <span className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={applicantSearch}
                      onChange={(event) => setApplicantSearch(event.target.value)}
                      placeholder="이름, 학번, 이메일, 연락처, 메모"
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
                    />
                  </span>
                </label>
                <SelectField
                  label="상태 필터"
                  value={applicantStatusFilter}
                  onChange={setApplicantStatusFilter}
                  options={[{ value: "all", label: "전체" }, ...applicantStatusOptions]}
                />
              </div>
              <div className="mt-5 grid gap-3 md:hidden">
                {filteredApplicants.length === 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                    조건에 맞는 지원자가 없습니다.
                  </div>
                )}
                {filteredApplicants.map((applicant) => (
                  <ApplicantMobileCard
                    key={applicant.id}
                    applicant={applicant}
                    disabled={!canHandleApplicants}
                    onUpdate={updateApplicant}
                    onLocalChange={(id, values) =>
                      setState((prev) => ({
                        ...prev,
                        applicants: prev.applicants.map((item) =>
                          item.id === id ? { ...item, ...values } : item
                        ),
                      }))
                    }
                  />
                ))}
              </div>
              <div className="mt-5 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[960px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                      <th className="py-3 pr-3">이름</th>
                      <th className="py-3 pr-3">학번</th>
                      <th className="py-3 pr-3">연락처</th>
                      <th className="py-3 pr-3">상태</th>
                      <th className="py-3 pr-3">점수</th>
                      <th className="py-3 pr-3">메모</th>
                      <th className="py-3 pr-3">파일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplicants.map((applicant) => (
                      <tr key={applicant.id} className="border-b border-slate-100 align-top">
                        <td className="py-3 pr-3 font-medium">{applicant.name}</td>
                        <td className="py-3 pr-3 font-mono text-xs">{applicant.student_id}</td>
                        <td className="py-3 pr-3 text-xs text-slate-600">
                          <div>{applicant.email}</div>
                          <div>{applicant.phone}</div>
                        </td>
                        <td className="py-3 pr-3">
                          <select
                            value={applicant.status}
                            disabled={!canHandleApplicants}
                            onChange={(event) => updateApplicant(applicant.id, { status: event.target.value as Applicant["status"] })}
                            className="rounded-md border border-slate-200 px-2 py-1 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                          >
                            {Object.entries(statusLabels).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 pr-3">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            inputMode="numeric"
                            value={applicant.review_score ?? ""}
                            disabled={!canHandleApplicants}
                            onBlur={(event) =>
                              updateApplicant(applicant.id, {
                                review_score: event.target.value ? Number(event.target.value) : null,
                              })
                            }
                            onChange={(event) =>
                              setState((prev) => ({
                                ...prev,
                                applicants: prev.applicants.map((item) =>
                                  item.id === applicant.id
                                    ? { ...item, review_score: event.target.value ? Number(event.target.value) : null }
                                    : item
                                ),
                              }))
                            }
                            className="w-20 rounded-md border border-slate-200 px-2 py-1 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                          />
                        </td>
                        <td className="py-3 pr-3">
                          <textarea
                            value={applicant.admin_note ?? ""}
                            rows={2}
                            maxLength={applicantAdminNoteMaxLength}
                            disabled={!canHandleApplicants}
                            onBlur={(event) => updateApplicant(applicant.id, { admin_note: event.target.value })}
                            onChange={(event) =>
                              setState((prev) => ({
                                ...prev,
                                applicants: prev.applicants.map((item) =>
                                  item.id === applicant.id ? { ...item, admin_note: event.target.value } : item
                                ),
                              }))
                            }
                            className="w-52 rounded-md border border-slate-200 px-2 py-1 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                          />
                          <p className="mt-1 text-[11px] text-slate-400">
                            {(applicant.admin_note ?? "").length}/{applicantAdminNoteMaxLength}
                          </p>
                        </td>
                        <td className="py-3 pr-3">
                          {applicant.signed_url ? (
                            <a href={applicant.signed_url} target="_blank" rel="noreferrer" className="text-gold-dark underline">
                              열기
                            </a>
                          ) : (
                            <span className="text-slate-400">없음</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredApplicants.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                          조건에 맞는 지원자가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === "recruitment" && (
            <EditorList
              title="모집 관리"
              items={state.recruitment}
              canAdd={canWrite}
              onAdd={() =>
                updateList("recruitment", [
                  {
                    generation: 10,
                    title: "금은동 신입부원 모집",
                    is_open: false,
                    start_at: null,
                    end_at: null,
                    document_result_at: null,
                    interview_at: null,
                    final_result_at: null,
                    meeting_time: "매주 화요일 19:00 정기모임",
                    requirements: [],
                    fee_note: "",
                    docx_url: "",
                    hwp_url: "",
                    privacy_retention: "지원 결과 발표일로부터 6개월 후 파기",
                    status: "draft",
                  },
                  ...state.recruitment,
                ])
              }
            >
              {state.recruitment.map((item, index) => (
                <div key={item.id ?? `new-${index}`} className="grid gap-4 rounded-xl border border-slate-200 p-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="기수" type="number" value={item.generation} onChange={(value) => updateList("recruitment", state.recruitment.map((x, i) => i === index ? { ...x, generation: Number(value) } : x))} />
                    <Field label="제목" value={item.title} onChange={(value) => updateList("recruitment", state.recruitment.map((x, i) => i === index ? { ...x, title: value } : x))} />
                    <SelectField label="상태" value={item.status} options={contentStatusOptions} onChange={(value) => updateList("recruitment", state.recruitment.map((x, i) => i === index ? { ...x, status: value as RecruitmentCycle["status"] } : x))} />
                    <Field label="시작" type="datetime-local" value={toDatetimeLocal(item.start_at)} onChange={(value) => updateList("recruitment", state.recruitment.map((x, i) => i === index ? { ...x, start_at: fromDatetimeLocal(value) } : x))} />
                    <Field label="마감" type="datetime-local" value={toDatetimeLocal(item.end_at)} onChange={(value) => updateList("recruitment", state.recruitment.map((x, i) => i === index ? { ...x, end_at: fromDatetimeLocal(value) } : x))} />
                    <label className="flex items-end gap-2 text-sm font-medium text-slate-700">
                      <input type="checkbox" checked={item.is_open} onChange={(event) => updateList("recruitment", state.recruitment.map((x, i) => i === index ? { ...x, is_open: event.target.checked } : x))} />
                      모집 열림
                    </label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="DOCX URL" hint="/파일명.docx 또는 https URL" value={item.docx_url} onChange={(value) => updateList("recruitment", state.recruitment.map((x, i) => i === index ? { ...x, docx_url: value } : x))} />
                    <Field label="HWP URL" hint="/파일명.hwp 또는 https URL" value={item.hwp_url} onChange={(value) => updateList("recruitment", state.recruitment.map((x, i) => i === index ? { ...x, hwp_url: value } : x))} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="서류 발표" type="datetime-local" value={toDatetimeLocal(item.document_result_at)} onChange={(value) => updateList("recruitment", state.recruitment.map((x, i) => i === index ? { ...x, document_result_at: fromDatetimeLocal(value) } : x))} />
                    <Field label="면접" type="datetime-local" value={toDatetimeLocal(item.interview_at)} onChange={(value) => updateList("recruitment", state.recruitment.map((x, i) => i === index ? { ...x, interview_at: fromDatetimeLocal(value) } : x))} />
                    <Field label="최종 발표" type="datetime-local" value={toDatetimeLocal(item.final_result_at)} onChange={(value) => updateList("recruitment", state.recruitment.map((x, i) => i === index ? { ...x, final_result_at: fromDatetimeLocal(value) } : x))} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="정규 활동" hint="예: 매주 화요일 19:00 정기모임" value={item.meeting_time} onChange={(value) => updateList("recruitment", state.recruitment.map((x, i) => i === index ? { ...x, meeting_time: value } : x))} />
                    <Field label="회비 안내" value={item.fee_note} onChange={(value) => updateList("recruitment", state.recruitment.map((x, i) => i === index ? { ...x, fee_note: value } : x))} />
                    <Field label="개인정보 보유 기간" value={item.privacy_retention} onChange={(value) => updateList("recruitment", state.recruitment.map((x, i) => i === index ? { ...x, privacy_retention: value } : x))} />
                  </div>
                  <TextField label="지원 자격 · 줄바꿈 구분" value={joinList(item.requirements)} onChange={(value) => updateList("recruitment", state.recruitment.map((x, i) => i === index ? { ...x, requirements: splitLines(value) } : x))} />
                  <div className="flex gap-2">
                    <AdminButton onClick={() => saveItemAndReload("recruitment", item as unknown as Record<string, unknown>)} disabled={!canWrite}>
                      <Save className="h-4 w-4" />
                      저장
                    </AdminButton>
                    <AdminButton variant="danger" onClick={() => deleteItem("recruitment", item.id)} disabled={!canWrite}>
                      <Trash2 className="h-4 w-4" />
                      삭제
                    </AdminButton>
                  </div>
                </div>
              ))}
            </EditorList>
          )}

          {tab === "content" && (
            <section className="grid gap-5">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold">핵심 블록 매핑</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  공개 화면에 연결된 주요 콘텐츠 블록입니다. 누락이면 `supabase-schema.sql`을 재적용하거나 블록을 추가하세요.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {blockGuideItems.map((guide) => {
                    const block = state.blocks.find(
                      (item) => item.page_slug === guide.page && item.block_key === guide.key
                    );
                    const statusLabel = block
                      ? contentStatusOptions.find((option) => option.value === block.status)?.label ?? block.status
                      : "누락";

                    return (
                      <div
                        key={`${guide.page}/${guide.key}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-950">{guide.label}</p>
                            <p className="mt-1 font-mono text-xs text-slate-500">
                              {guide.page}/{guide.key}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              block?.status === "published"
                                ? "bg-emerald-50 text-emerald-700"
                                : block
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-red-50 text-red-700"
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{guide.note}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold">사이트 기본 설정</h2>
                <p className="mt-1 text-sm text-slate-500">헤더, 푸터, 홈 CTA, 지원 페이지 문의 채널에 공통 적용됩니다.</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {siteSettingFields.map((field) =>
                    field.kind === "theme-preset" ? (
                      <SelectField
                        key={field.key}
                        label={field.label}
                        value={state.settings[field.key]}
                        options={organizationThemePresets.map((preset) => ({
                          value: preset.key,
                          label: `${preset.label} · ${preset.description}`,
                        }))}
                        onChange={(next) =>
                          setState((prev) => ({
                            ...prev,
                            settings: { ...prev.settings, [field.key]: next as SiteSettingsValue["brand_preset"] },
                          }))
                        }
                      />
                    ) : (
                      <Field
                        key={field.key}
                        label={field.label}
                        type={getSettingInputType(field.key)}
                        hint={getSettingHint(field.key)}
                        value={state.settings[field.key]}
                        onChange={(next) =>
                          setState((prev) => ({
                            ...prev,
                            settings: { ...prev.settings, [field.key]: next },
                          }))
                        }
                      />
                    )
                  )}
                </div>
                <div className="mt-4">
                  <AdminButton onClick={saveSettings} disabled={!canWrite}>
                    {saving === "settings" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    설정 저장
                  </AdminButton>
                </div>
              </div>

              <EditorList
                title="페이지 메타"
                items={state.pages}
                canAdd={canWrite}
                onAdd={() => updateList("pages", [{ slug: "new-page", title: "", description: "", status: "draft", sort_order: state.pages.length + 1 }, ...state.pages])}
              >
                {state.pages.map((item, index) => (
                  <div key={item.id ?? `page-${index}`} className="grid gap-4 rounded-xl border border-slate-200 p-4">
                    <div className="grid gap-4 md:grid-cols-4">
                      <Field label="슬러그" value={item.slug} onChange={(value) => updateList("pages", state.pages.map((x, i) => i === index ? { ...x, slug: value } : x))} />
                      <Field label="제목" value={item.title} onChange={(value) => updateList("pages", state.pages.map((x, i) => i === index ? { ...x, title: value } : x))} />
                      <SelectField label="상태" value={item.status} options={contentStatusOptions} onChange={(value) => updateList("pages", state.pages.map((x, i) => i === index ? { ...x, status: value as ContentPage["status"] } : x))} />
                      <Field label="순서" type="number" value={item.sort_order} onChange={(value) => updateList("pages", state.pages.map((x, i) => i === index ? { ...x, sort_order: Number(value) } : x))} />
                    </div>
                    <TextField label="검색/공유 설명" value={item.description} onChange={(value) => updateList("pages", state.pages.map((x, i) => i === index ? { ...x, description: value } : x))} rows={3} />
                    <div className="flex gap-2">
                      <AdminButton onClick={() => saveItemAndReload("pages", item as unknown as Record<string, unknown>)} disabled={!canWrite}>
                        <Save className="h-4 w-4" />
                        저장
                      </AdminButton>
                      <AdminButton variant="danger" onClick={() => deleteItem("pages", item.id)} disabled={!canWrite}>
                        <Trash2 className="h-4 w-4" />
                        삭제
                      </AdminButton>
                    </div>
                  </div>
                ))}
              </EditorList>

              <EditorList
                title="콘텐츠 블록"
                items={state.blocks}
                canAdd={canWrite}
                onAdd={() => updateList("blocks", [{ page_slug: "home", block_key: "new-block", title: "", subtitle: "", body: "", cta_label: "", cta_href: "", media_url: "", status: "draft", sort_order: state.blocks.length + 1 }, ...state.blocks])}
              >
                {state.blocks.map((item, index) => (
                  <div key={item.id ?? `block-${index}`} className="grid gap-4 rounded-xl border border-slate-200 p-4">
                    <div className="grid gap-4 md:grid-cols-4">
                      <Field label="페이지" value={item.page_slug} onChange={(value) => updateList("blocks", state.blocks.map((x, i) => i === index ? { ...x, page_slug: value } : x))} />
                      <Field label="키" value={item.block_key} onChange={(value) => updateList("blocks", state.blocks.map((x, i) => i === index ? { ...x, block_key: value } : x))} />
                      <SelectField label="상태" value={item.status} options={contentStatusOptions} onChange={(value) => updateList("blocks", state.blocks.map((x, i) => i === index ? { ...x, status: value as ContentBlock["status"] } : x))} />
                      <Field label="순서" type="number" value={item.sort_order} onChange={(value) => updateList("blocks", state.blocks.map((x, i) => i === index ? { ...x, sort_order: Number(value) } : x))} />
                    </div>
                    <Field label="제목" value={item.title} onChange={(value) => updateList("blocks", state.blocks.map((x, i) => i === index ? { ...x, title: value } : x))} />
                    <Field label="부제목" value={item.subtitle} onChange={(value) => updateList("blocks", state.blocks.map((x, i) => i === index ? { ...x, subtitle: value } : x))} />
                    <TextField label="본문" value={item.body} onChange={(value) => updateList("blocks", state.blocks.map((x, i) => i === index ? { ...x, body: value } : x))} />
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="CTA 문구" value={item.cta_label} onChange={(value) => updateList("blocks", state.blocks.map((x, i) => i === index ? { ...x, cta_label: value } : x))} />
                      <Field label="CTA 링크" hint="/join 또는 https URL" value={item.cta_href} onChange={(value) => updateList("blocks", state.blocks.map((x, i) => i === index ? { ...x, cta_href: value } : x))} />
                      <Field label="미디어 URL" hint="이미지/문서 경로 또는 https URL" value={item.media_url} onChange={(value) => updateList("blocks", state.blocks.map((x, i) => i === index ? { ...x, media_url: value } : x))} />
                    </div>
                    <div className="flex gap-2">
                      <AdminButton onClick={() => saveItemAndReload("blocks", item as unknown as Record<string, unknown>)} disabled={!canWrite}>
                        <Save className="h-4 w-4" />
                        저장
                      </AdminButton>
                      <AdminButton variant="danger" onClick={() => deleteItem("blocks", item.id)} disabled={!canWrite}>
                        <Trash2 className="h-4 w-4" />
                        삭제
                      </AdminButton>
                    </div>
                  </div>
                ))}
              </EditorList>
            </section>
          )}

          {tab === "activities" && (
            <SimpleResourceEditor
              title="활동 CMS"
              items={state.activities}
              addLabel="활동 추가"
              canAdd={canWrite}
              onAdd={() => updateList("activities", [{ title: "", subtitle: "", description: "", category: "regular", tags: [], status: "draft", sort_order: state.activities.length + 1 }, ...state.activities])}
              render={(item, index) => (
                <>
                  <Field label="제목" value={item.title} onChange={(value) => updateList("activities", state.activities.map((x, i) => i === index ? { ...x, title: value } : x))} />
                  <Field label="부제목" value={item.subtitle} onChange={(value) => updateList("activities", state.activities.map((x, i) => i === index ? { ...x, subtitle: value } : x))} />
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="분류" value={item.category} onChange={(value) => updateList("activities", state.activities.map((x, i) => i === index ? { ...x, category: value } : x))} />
                    <SelectField label="상태" value={item.status} options={contentStatusOptions} onChange={(value) => updateList("activities", state.activities.map((x, i) => i === index ? { ...x, status: value as ActivityItem["status"] } : x))} />
                    <Field label="순서" type="number" value={item.sort_order} onChange={(value) => updateList("activities", state.activities.map((x, i) => i === index ? { ...x, sort_order: Number(value) } : x))} />
                  </div>
                  <TextField label="설명" value={item.description} onChange={(value) => updateList("activities", state.activities.map((x, i) => i === index ? { ...x, description: value } : x))} />
                  <Field label="태그(쉼표 구분)" value={item.tags.join(", ")} onChange={(value) => updateList("activities", state.activities.map((x, i) => i === index ? { ...x, tags: splitTags(value) } : x))} />
                  <ItemActions save={() => saveItemAndReload("activities", item as unknown as Record<string, unknown>)} remove={() => deleteItem("activities", item.id)} disabled={!canWrite} />
                </>
              )}
            />
          )}

          {tab === "achievements" && (
            <SimpleResourceEditor
              title="성과 CMS"
              items={state.achievements}
              addLabel="성과 추가"
              canAdd={canWrite}
              onAdd={() => updateList("achievements", [{ title: "", organization: "", result: "", kind: "placement", year: new Date().getFullYear(), status: "draft", sort_order: state.achievements.length + 1 }, ...state.achievements])}
              render={(item, index) => (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="제목/기관" value={item.title} onChange={(value) => updateList("achievements", state.achievements.map((x, i) => i === index ? { ...x, title: value } : x))} />
                    <SelectField label="분류" value={item.kind} options={achievementKindOptions} onChange={(value) => updateList("achievements", state.achievements.map((x, i) => i === index ? { ...x, kind: value as AchievementItem["kind"] } : x))} />
                    <Field label="연도" type="number" value={item.year} onChange={(value) => updateList("achievements", state.achievements.map((x, i) => i === index ? { ...x, year: Number(value) } : x))} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="기관/분야" value={item.organization} onChange={(value) => updateList("achievements", state.achievements.map((x, i) => i === index ? { ...x, organization: value } : x))} />
                    <SelectField label="상태" value={item.status} options={contentStatusOptions} onChange={(value) => updateList("achievements", state.achievements.map((x, i) => i === index ? { ...x, status: value as AchievementItem["status"] } : x))} />
                    <Field label="순서" type="number" value={item.sort_order} onChange={(value) => updateList("achievements", state.achievements.map((x, i) => i === index ? { ...x, sort_order: Number(value) } : x))} />
                  </div>
                  <Field label="결과/직무" value={item.result} onChange={(value) => updateList("achievements", state.achievements.map((x, i) => i === index ? { ...x, result: value } : x))} />
                  <ItemActions save={() => saveItemAndReload("achievements", item as unknown as Record<string, unknown>)} remove={() => deleteItem("achievements", item.id)} disabled={!canWrite} />
                </>
              )}
            />
          )}

          {tab === "history" && (
            <SimpleResourceEditor
              title="연혁 CMS"
              items={state.history}
              addLabel="연혁 추가"
              canAdd={canWrite}
              onAdd={() => updateList("history", [{ year: new Date().getFullYear(), generation: null, president: "", milestones: [], is_current: false, status: "draft", sort_order: state.history.length + 1 }, ...state.history])}
              render={(item, index) => (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="연도" type="number" value={item.year} onChange={(value) => updateList("history", state.history.map((x, i) => i === index ? { ...x, year: Number(value) } : x))} />
                    <Field label="기수" type="number" value={item.generation} onChange={(value) => updateList("history", state.history.map((x, i) => i === index ? { ...x, generation: value ? Number(value) : null } : x))} />
                    <Field label="회장" value={item.president} onChange={(value) => updateList("history", state.history.map((x, i) => i === index ? { ...x, president: value } : x))} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <SelectField label="상태" value={item.status} options={contentStatusOptions} onChange={(value) => updateList("history", state.history.map((x, i) => i === index ? { ...x, status: value as HistoryItem["status"] } : x))} />
                    <Field label="순서" type="number" value={item.sort_order} onChange={(value) => updateList("history", state.history.map((x, i) => i === index ? { ...x, sort_order: Number(value) } : x))} />
                    <label className="flex items-end gap-2 text-sm font-medium text-slate-700">
                      <input type="checkbox" checked={item.is_current} onChange={(event) => updateList("history", state.history.map((x, i) => i === index ? { ...x, is_current: event.target.checked } : x))} />
                      현재 기수
                    </label>
                  </div>
                  <TextField label="마일스톤 · 줄바꿈 구분" value={joinList(item.milestones)} onChange={(value) => updateList("history", state.history.map((x, i) => i === index ? { ...x, milestones: splitLines(value) } : x))} />
                  <ItemActions save={() => saveItemAndReload("history", item as unknown as Record<string, unknown>)} remove={() => deleteItem("history", item.id)} disabled={!canWrite} />
                </>
              )}
            />
          )}

          {tab === "faqs" && (
            <SimpleResourceEditor
              title="FAQ CMS"
              items={state.faqs}
              addLabel="FAQ 추가"
              canAdd={canWrite}
              onAdd={() => updateList("faqs", [{ question: "", answer: "", status: "draft", sort_order: state.faqs.length + 1 }, ...state.faqs])}
              render={(item, index) => (
                <>
                  <Field label="질문" value={item.question} onChange={(value) => updateList("faqs", state.faqs.map((x, i) => i === index ? { ...x, question: value } : x))} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectField label="상태" value={item.status} options={contentStatusOptions} onChange={(value) => updateList("faqs", state.faqs.map((x, i) => i === index ? { ...x, status: value as FAQItem["status"] } : x))} />
                    <Field label="순서" type="number" value={item.sort_order} onChange={(value) => updateList("faqs", state.faqs.map((x, i) => i === index ? { ...x, sort_order: Number(value) } : x))} />
                  </div>
                  <TextField label="답변" value={item.answer} onChange={(value) => updateList("faqs", state.faqs.map((x, i) => i === index ? { ...x, answer: value } : x))} />
                  <ItemActions save={() => saveItemAndReload("faqs", item as unknown as Record<string, unknown>)} remove={() => deleteItem("faqs", item.id)} disabled={!canWrite} />
                </>
              )}
            />
          )}

          {tab === "media" && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-lg font-bold">미디어 관리</h2>
                <p className="text-sm text-slate-500">이미지와 모집 양식 파일을 업로드합니다. SVG와 스크립트 실행 가능 파일은 허용하지 않습니다.</p>
              </div>
              <div className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-slate-700">파일</span>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.hwp,image/png,image/jpeg,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/x-hwp,application/haansofthwp,application/octet-stream"
                    aria-describedby={uploadFileError ? uploadFileErrorId : undefined}
                    onChange={(event) => {
                      setUploadFile(event.target.files?.[0] ?? null);
                      setMessage("");
                      setError("");
                    }}
                    className={`rounded-lg border bg-white px-3 py-2 text-sm ${
                      uploadFileError ? "border-red-300" : "border-slate-200"
                    }`}
                  />
                  <span className="text-xs text-slate-500">png, jpg, webp, pdf, docx, hwp · 최대 10MB</span>
                </label>
                <Field label="대체 텍스트/설명" value={uploadAlt} onChange={setUploadAlt} />
                <AdminButton onClick={uploadMedia} disabled={!canWrite || saving === "media" || Boolean(uploadFileError)}>
                  {saving === "media" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  업로드
                </AdminButton>
              </div>
              {uploadFile && (
                <div className="mt-3 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{uploadFile.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatAdminFileSize(uploadFile.size)} · {uploadFile.type || "MIME 없음"}
                    </p>
                    {uploadFileError && (
                      <p id={uploadFileErrorId} className="mt-1 text-xs text-red-600" role="alert">
                        {uploadFileError}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={clearUploadFile}
                    className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:border-ink/20 hover:text-ink"
                  >
                    <X className="h-3.5 w-3.5" />
                    파일 해제
                  </button>
                </div>
              )}
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {state.media.map((item) => (
                  <div key={item.id} className="grid gap-4 rounded-lg border border-slate-200 p-4">
                    {item.kind === "image" && item.public_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.public_url} alt={item.alt ?? ""} className="aspect-video w-full rounded-lg border border-slate-100 object-cover" />
                    )}
                    <div>
                      <p className="break-all font-medium">{item.path}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.bucket} · {item.kind}</p>
                    </div>
                    <Field
                      label="대체 텍스트/설명"
                      value={item.alt}
                      onChange={(value) => updateList("media", state.media.map((x) => x.id === item.id ? { ...x, alt: value } : x))}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SelectField
                        label="상태"
                        value={item.status}
                        options={contentStatusOptions}
                        onChange={(value) => updateList("media", state.media.map((x) => x.id === item.id ? { ...x, status: value as MediaAsset["status"] } : x))}
                      />
                      <SelectField
                        label="분류"
                        value={item.kind}
                        options={[{ value: "image", label: "이미지" }, { value: "document", label: "문서" }]}
                        onChange={(value) => updateList("media", state.media.map((x) => x.id === item.id ? { ...x, kind: value } : x))}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <AdminButton onClick={() => updateMedia(item.id, { alt: item.alt, status: item.status, kind: item.kind })} disabled={!canWrite}>
                        <Save className="h-4 w-4" />
                        저장
                      </AdminButton>
                      {item.public_url && (
                        <AdminButton variant="secondary" onClick={() => window.open(item.public_url ?? "", "_blank", "noopener,noreferrer")}>
                          열기
                        </AdminButton>
                      )}
                      {item.public_url && (
                        <AdminButton variant="secondary" onClick={() => copyMediaUrl(item.public_url)}>
                          URL 복사
                        </AdminButton>
                      )}
                      <AdminButton variant="danger" onClick={() => deleteMedia(item)} disabled={!canWrite}>
                        <Trash2 className="h-4 w-4" />
                        삭제
                      </AdminButton>
                    </div>
                  </div>
                ))}
                {state.media.length === 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                    업로드된 미디어가 없습니다.
                  </div>
                )}
              </div>
            </section>
          )}

          {tab === "admins" && (
            <SimpleResourceEditor
              title="관리자 계정"
              items={state.admins}
              addLabel="관리자 추가"
              description="활성 계정만 관리자 API와 대시보드에 접근할 수 있습니다."
              canAdd={canManageAdminAccounts}
              onAdd={() =>
                updateList("admins", [
                  { id: "", email: "", name: "", role: "editor", is_active: true, __isNew: true } as AdminProfile & { __isNew: boolean },
                  ...state.admins,
                ])
              }
              render={(item, index) => (
                <>
                  <div className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    Supabase Auth에서 계정을 만든 뒤, 해당 사용자의 UUID를 입력해야 관리자 권한이 연결됩니다.
                    관리자 계정 수정은 소유자 권한에서만 처리됩니다.
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="사용자 UUID" value={item.id} onChange={(value) => updateList("admins", state.admins.map((x, i) => i === index ? { ...x, id: value } : x))} />
                    <Field label="이메일" value={item.email} onChange={(value) => updateList("admins", state.admins.map((x, i) => i === index ? { ...x, email: value } : x))} />
                    <Field label="이름" value={item.name} onChange={(value) => updateList("admins", state.admins.map((x, i) => i === index ? { ...x, name: value } : x))} />
                    <SelectField label="권한" value={item.role} options={adminRoleOptions} onChange={(value) => updateList("admins", state.admins.map((x, i) => i === index ? { ...x, role: value as AdminProfile["role"] } : x))} />
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="checkbox" checked={item.is_active} onChange={(event) => updateList("admins", state.admins.map((x, i) => i === index ? { ...x, is_active: event.target.checked } : x))} />
                    활성 계정
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <AdminButton onClick={() => saveItemAndReload("admins", item as unknown as Record<string, unknown>, Boolean((item as { __isNew?: boolean }).__isNew))} disabled={!canManageAdminAccounts}>
                      <Save className="h-4 w-4" />
                      저장
                    </AdminButton>
                    {item.id !== admin?.id && (
                      <AdminButton variant="danger" onClick={() => deleteItem("admins", item.id)} disabled={!canManageAdminAccounts}>
                        <Trash2 className="h-4 w-4" />
                        삭제
                      </AdminButton>
                    )}
                  </div>
                </>
              )}
            />
          )}

          {tab === "audit" && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">감사 로그</h2>
              <div className="mt-4 grid gap-2">
                {state.audit.slice(0, 80).map((log) => (
                  <div key={log.id} className="grid gap-1 rounded-lg border border-slate-100 p-3 text-sm md:grid-cols-[180px_1fr_1fr]">
                    <span className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString("ko-KR")}</span>
                    <span className="font-medium">{log.action}</span>
                    <span className="text-slate-500">{log.actor_email ?? "system"} · {log.target_table ?? "-"}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ApplicantMobileCard({
  applicant,
  disabled = false,
  onUpdate,
  onLocalChange,
}: {
  applicant: Applicant;
  disabled?: boolean;
  onUpdate: (id: string, values: Partial<Applicant>) => void | Promise<void>;
  onLocalChange: (id: string, values: Partial<Applicant>) => void;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-950">{applicant.name}</p>
          <p className="mt-1 font-mono text-xs text-slate-500">{applicant.student_id}</p>
        </div>
        {applicant.signed_url ? (
          <a href={applicant.signed_url} target="_blank" rel="noreferrer" className="shrink-0 text-sm font-semibold text-gold-dark underline">
            파일
          </a>
        ) : (
          <span className="shrink-0 text-sm text-slate-400">파일 없음</span>
        )}
      </div>

      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        <div>{applicant.email}</div>
        <div>{applicant.phone}</div>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-slate-700">상태</span>
          <select
            value={applicant.status}
            disabled={disabled}
            onChange={(event) => onUpdate(applicant.id, { status: event.target.value as Applicant["status"] })}
            className="min-h-11 rounded-lg border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          >
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-slate-700">점수</span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            inputMode="numeric"
            value={applicant.review_score ?? ""}
            disabled={disabled}
            onBlur={(event) =>
              onUpdate(applicant.id, {
                review_score: event.target.value ? Number(event.target.value) : null,
              })
            }
            onChange={(event) =>
              onLocalChange(applicant.id, {
                review_score: event.target.value ? Number(event.target.value) : null,
              })
            }
            className="min-h-11 rounded-lg border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          />
        </label>

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-slate-700">메모</span>
          <textarea
            value={applicant.admin_note ?? ""}
            rows={3}
            maxLength={applicantAdminNoteMaxLength}
            disabled={disabled}
            onBlur={(event) => onUpdate(applicant.id, { admin_note: event.target.value })}
            onChange={(event) => onLocalChange(applicant.id, { admin_note: event.target.value })}
            className="rounded-lg border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          />
          <span className="text-right text-xs text-slate-400">
            {(applicant.admin_note ?? "").length}/{applicantAdminNoteMaxLength}
          </span>
        </label>
      </div>
    </article>
  );
}

function EditorList({
  title,
  items,
  onAdd,
  canAdd = true,
  children,
}: {
  title: string;
  items: unknown[];
  onAdd: () => void;
  canAdd?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-slate-500">{items.length}개 항목</p>
        </div>
        <AdminButton onClick={onAdd} variant="secondary" disabled={!canAdd}>추가</AdminButton>
      </div>
      <div className="mt-5 grid gap-4">{children}</div>
    </section>
  );
}

function SimpleResourceEditor<T>({
  title,
  items,
  addLabel,
  description = "published 항목만 공개 페이지에 표시됩니다.",
  canAdd = true,
  onAdd,
  render,
}: {
  title: string;
  items: T[];
  addLabel: string;
  description?: string;
  canAdd?: boolean;
  onAdd: () => void;
  render: (item: T, index: number) => React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <AdminButton onClick={onAdd} variant="secondary" disabled={!canAdd}>{addLabel}</AdminButton>
      </div>
      <div className="mt-5 grid gap-4">
        {items.map((item, index) => (
          <div key={(item as { id?: string }).id ?? index} className="grid gap-4 rounded-xl border border-slate-200 p-4">
            {render(item, index)}
          </div>
        ))}
      </div>
    </section>
  );
}

function ItemActions({
  save,
  remove,
  disabled = false,
}: {
  save: () => void;
  remove: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <AdminButton onClick={save} disabled={disabled}>
        <Save className="h-4 w-4" />
        저장
      </AdminButton>
      <AdminButton variant="danger" onClick={remove} disabled={disabled}>
        <Trash2 className="h-4 w-4" />
        삭제
      </AdminButton>
    </div>
  );
}
