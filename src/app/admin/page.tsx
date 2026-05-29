"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { toCsv } from "@/lib/csv";
import {
  canManageAdmins as roleCanManageAdmins,
  canManageApplicants as roleCanManageApplicants,
  canViewAudit as roleCanViewAudit,
  canWriteContent,
} from "@/lib/admin-permissions";
import { siteSettingFields } from "@/lib/site-settings";
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
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserCog,
  Users,
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

const defaultSettings: SiteSettingsValue = {
  site_title: "금은동",
  club_name: "충북대학교 금융권 취업 동아리 금은동",
  hero_title: "충북대 금융권 취업 동아리, 금은동",
  hero_subtitle: "신문 스크랩, 리포트 분석, 세일즈 페어, 현직자 멘토링을 진행합니다.",
  primary_cta_label: "지원 안내 보기",
  primary_cta_href: "/join",
  secondary_cta_label: "활동 살펴보기",
  secondary_cta_href: "/activity",
  contact_name: "6대 회장 이승현",
  contact_phone: "010-2623-2004",
  contact_email: "cni351237@naver.com",
  instagram_url: "https://www.instagram.com/cbnu_gold/",
  naver_cafe_url: "https://cafe.naver.com/cufaclub",
};

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

function getSettingInputType(key: keyof SiteSettingsValue) {
  if (key === "contact_email") return "email";
  if (key === "contact_phone") return "tel";
  if (key === "instagram_url" || key === "naver_cafe_url") return "url";
  return "text";
}

function getSettingHint(key: keyof SiteSettingsValue) {
  if (key === "primary_cta_href" || key === "secondary_cta_href") {
    return "예: /join 또는 https://forms.gle/...";
  }
  if (key === "instagram_url" || key === "naver_cafe_url") {
    return "외부 채널은 https URL만 저장됩니다. 비워두면 공개 화면에서 숨겨집니다.";
  }
  if (key === "contact_phone") return "하이픈 포함 입력 가능";
  return undefined;
}

function getActionErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
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
  const router = useRouter();
  const supabaseRef = useRef<SupabaseClient | null>(null);

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
    if (!response.ok) throw new Error(data.error ?? "요청 처리에 실패했습니다");
    return data;
  }

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
      settings: settings.items?.[0]?.value ?? defaultSettings,
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
    link.click();
    URL.revokeObjectURL(url);
  }

  async function uploadMedia() {
    if (!requireWrite("미디어 업로드")) return;
    if (!uploadFile) {
      setError("업로드할 파일을 선택해주세요.");
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
      setUploadAlt("");
      setMessage("미디어를 업로드했습니다.");
      await loadAll(token);
    } catch (uploadError) {
      setError(getActionErrorMessage(uploadError, "미디어 업로드에 실패했습니다."));
    } finally {
      setSaving("");
    }
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
              className={`rounded-xl border px-4 py-3 text-sm ${
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
                <h2 className="text-lg font-bold">운영 체크포인트</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">지원서 파일은 signed URL로만 열립니다.</p>
                  <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">콘텐츠는 published 상태만 공개 페이지에 노출됩니다.</p>
                  <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">모든 주요 수정은 audit_logs에 기록됩니다.</p>
                  <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">활성 소유자 계정은 최소 1개 이상 유지됩니다.</p>
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
                    <Field label="시작" type="datetime-local" value={item.start_at?.slice(0, 16) ?? ""} onChange={(value) => updateList("recruitment", state.recruitment.map((x, i) => i === index ? { ...x, start_at: value ? new Date(value).toISOString() : null } : x))} />
                    <Field label="마감" type="datetime-local" value={item.end_at?.slice(0, 16) ?? ""} onChange={(value) => updateList("recruitment", state.recruitment.map((x, i) => i === index ? { ...x, end_at: value ? new Date(value).toISOString() : null } : x))} />
                    <label className="flex items-end gap-2 text-sm font-medium text-slate-700">
                      <input type="checkbox" checked={item.is_open} onChange={(event) => updateList("recruitment", state.recruitment.map((x, i) => i === index ? { ...x, is_open: event.target.checked } : x))} />
                      모집 열림
                    </label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="DOCX URL" value={item.docx_url} onChange={(value) => updateList("recruitment", state.recruitment.map((x, i) => i === index ? { ...x, docx_url: value } : x))} />
                    <Field label="HWP URL" value={item.hwp_url} onChange={(value) => updateList("recruitment", state.recruitment.map((x, i) => i === index ? { ...x, hwp_url: value } : x))} />
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
                <h2 className="text-lg font-bold">사이트 기본 설정</h2>
                <p className="mt-1 text-sm text-slate-500">헤더, 푸터, 홈 CTA, 지원 페이지 문의 채널에 공통 적용됩니다.</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {siteSettingFields.map((field) => (
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
                  ))}
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
                <p className="text-sm text-slate-500">PNG, JPG, WebP, PDF만 업로드합니다. SVG는 공개 버킷 보안상 허용하지 않습니다.</p>
              </div>
              <div className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-slate-700">파일</span>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
                    onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <Field label="대체 텍스트/설명" value={uploadAlt} onChange={setUploadAlt} />
                <AdminButton onClick={uploadMedia} disabled={!canWrite}>
                  {saving === "media" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  업로드
                </AdminButton>
              </div>
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
            disabled={disabled}
            onBlur={(event) => onUpdate(applicant.id, { admin_note: event.target.value })}
            onChange={(event) => onLocalChange(applicant.id, { admin_note: event.target.value })}
            className="rounded-lg border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          />
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
