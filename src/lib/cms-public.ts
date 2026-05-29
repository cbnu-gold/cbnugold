import { createClient } from "@supabase/supabase-js";
import { cache } from "react";
import {
  fallbackCmsData,
  fallbackRecruitment,
  fallbackSettings,
} from "@/lib/cms-fallback";
export {
  formatKoreanDateTime,
  getRecruitmentPhase,
  getRecruitmentPhaseLabel,
  isRecruitmentOpen,
} from "@/lib/recruitment";
import type {
  ActivityItem,
  AchievementItem,
  ContentBlock,
  ContentPage,
  FAQItem,
  HistoryItem,
  PublicCmsData,
  RecruitmentCycle,
  SiteSettingsValue,
} from "@/types";

function getPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function chooseFallback<T>(value: T[] | null | undefined, fallback: T[]) {
  return value && value.length > 0 ? value : fallback;
}

export const getPublicCmsData = cache(async function getPublicCmsData(): Promise<PublicCmsData> {
  const supabase = getPublicSupabase();
  if (!supabase) return fallbackCmsData;

  try {
    const [
      settingsResult,
      pagesResult,
      blocksResult,
      recruitmentResult,
      activitiesResult,
      achievementsResult,
      historyResult,
      faqsResult,
    ] = await Promise.all([
      supabase
        .from("site_settings")
        .select("value")
        .eq("key", "site")
        .eq("status", "published")
        .maybeSingle(),
      supabase
        .from("content_pages")
        .select("*")
        .eq("status", "published")
        .order("sort_order"),
      supabase
        .from("content_blocks")
        .select("*")
        .eq("status", "published")
        .order("sort_order"),
      supabase
        .from("recruitment_cycles")
        .select("*")
        .eq("status", "published")
        .order("generation", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("activity_items")
        .select("*")
        .eq("status", "published")
        .order("sort_order"),
      supabase
        .from("achievement_items")
        .select("*")
        .eq("status", "published")
        .order("sort_order"),
      supabase
        .from("history_entries")
        .select("*")
        .eq("status", "published")
        .order("year"),
      supabase
        .from("faq_items")
        .select("*")
        .eq("status", "published")
        .order("sort_order"),
    ]);

    return {
      settings:
        (settingsResult.data?.value as SiteSettingsValue | undefined) ??
        fallbackSettings,
      pages: chooseFallback(
        pagesResult.data as ContentPage[] | null,
        fallbackCmsData.pages
      ),
      blocks: chooseFallback(
        blocksResult.data as ContentBlock[] | null,
        fallbackCmsData.blocks
      ),
      recruitment:
        (recruitmentResult.data as RecruitmentCycle | null) ??
        fallbackRecruitment,
      activities: chooseFallback(
        activitiesResult.data as ActivityItem[] | null,
        fallbackCmsData.activities
      ),
      achievements: chooseFallback(
        achievementsResult.data as AchievementItem[] | null,
        fallbackCmsData.achievements
      ),
      history: chooseFallback(
        historyResult.data as HistoryItem[] | null,
        fallbackCmsData.history
      ),
      faqs: chooseFallback(faqsResult.data as FAQItem[] | null, fallbackCmsData.faqs),
    };
  } catch (error) {
    console.error("CMS fallback activated:", error);
    return fallbackCmsData;
  }
});

export async function getPublicPage(slug: string) {
  const data = await getPublicCmsData();
  return data.pages.find((page) => page.slug === slug) ?? null;
}
