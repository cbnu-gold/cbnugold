export interface Activity {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
}

export interface Placement {
  company: string;
  position: string;
  type: "은행" | "증권" | "보험" | "공기업" | "정부";
}

export interface Award {
  title: string;
  result: string;
}

export interface HistoryEntry {
  year: number;
  generation: number;
  president: string;
  milestones: string[];
  isCurrent?: boolean;
}

export interface FAQ {
  q: string;
  a: string;
}

export interface Generation {
  gen: number;
  count: number;
  year: string;
  president: string | null;
}

export interface MentoringPartner {
  name: string;
  type: string;
}

export interface RecruitmentSettings {
  is_open: boolean;
  generation: number;
  start_date: string;
  end_date: string;
  end_time: string;
  document_result_date: string;
  interview_date: string;
  final_result_date: string;
}

export interface Applicant {
  id: string;
  name: string;
  student_id: string;
  email: string;
  phone: string;
  file_url: string;
  file_name: string;
  generation: number;
  status: "pending" | "reviewed" | "interview" | "accepted" | "rejected";
  applied_at: string;
  notes?: string;
  recruitment_cycle_id?: string | null;
  admin_note?: string | null;
  review_score?: number | null;
  signed_url?: string | null;
  updated_at?: string;
}

export interface Stat {
  number: string;
  suffix: string;
  label: string;
}

export type ContentStatus = "draft" | "published" | "archived";
export type AdminRole = "owner" | "admin" | "editor" | "viewer";

export interface AdminProfile {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  is_active: boolean;
}

export interface SiteSettingsValue {
  site_title: string;
  club_name: string;
  hero_title: string;
  hero_subtitle: string;
  primary_cta_label: string;
  primary_cta_href: string;
  secondary_cta_label: string;
  secondary_cta_href: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  instagram_url: string;
  naver_cafe_url: string;
}

export interface ContentPage {
  id?: string;
  slug: string;
  title: string;
  description: string | null;
  status: ContentStatus;
  sort_order: number;
  updated_at?: string;
}

export interface ContentBlock {
  id?: string;
  page_slug: string;
  block_key: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  cta_label: string | null;
  cta_href: string | null;
  media_url: string | null;
  data?: Record<string, unknown>;
  status: ContentStatus;
  sort_order: number;
  updated_at?: string;
}

export interface RecruitmentCycle {
  id?: string;
  generation: number;
  title: string;
  is_open: boolean;
  start_at: string | null;
  end_at: string | null;
  document_result_at: string | null;
  interview_at: string | null;
  final_result_at: string | null;
  meeting_time: string | null;
  requirements: string[];
  fee_note: string | null;
  docx_url: string | null;
  hwp_url: string | null;
  privacy_retention: string;
  status: ContentStatus;
  updated_at?: string;
}

export interface ActivityItem {
  id?: string;
  title: string;
  subtitle: string | null;
  description: string;
  category: "regular" | "special" | string;
  tags: string[];
  status: ContentStatus;
  sort_order: number;
}

export interface AchievementItem {
  id?: string;
  title: string;
  organization: string | null;
  result: string;
  kind: "placement" | "award" | "metric";
  year: number | null;
  status: ContentStatus;
  sort_order: number;
}

export interface HistoryItem {
  id?: string;
  year: number;
  generation: number | null;
  president: string | null;
  milestones: string[];
  is_current: boolean;
  status: ContentStatus;
  sort_order: number;
}

export interface FAQItem {
  id?: string;
  question: string;
  answer: string;
  status: ContentStatus;
  sort_order: number;
}

export interface MediaAsset {
  id?: string;
  bucket: string;
  path: string;
  public_url: string | null;
  alt: string | null;
  kind: string;
  status: ContentStatus;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  actor_email: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PublicCmsData {
  settings: SiteSettingsValue;
  pages: ContentPage[];
  blocks: ContentBlock[];
  recruitment: RecruitmentCycle;
  activities: ActivityItem[];
  achievements: AchievementItem[];
  history: HistoryItem[];
  faqs: FAQItem[];
}
