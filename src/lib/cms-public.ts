import { createClient } from "@supabase/supabase-js";
import { cache } from "react";
import {
  fallbackCmsData,
  fallbackRecruitment,
  fallbackSettings,
} from "@/lib/cms-fallback";
import { normalizeOptionalCmsHref } from "@/lib/cms-links";
import { validateAndNormalizeSiteSettingsValue } from "@/lib/site-settings";
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

function getSafeSettings(value: unknown) {
  return validateAndNormalizeSiteSettingsValue(value).value ?? fallbackSettings;
}

function getSafeBlocks(blocks: ContentBlock[]) {
  return blocks.map((block) => ({
    ...block,
    cta_href: normalizeOptionalCmsHref(block.cta_href),
    media_url: normalizeOptionalCmsHref(block.media_url),
  }));
}

function getSafeRecruitment(recruitment: RecruitmentCycle) {
  return {
    ...recruitment,
    docx_url: normalizeOptionalCmsHref(recruitment.docx_url),
    hwp_url: normalizeOptionalCmsHref(recruitment.hwp_url),
  };
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function getSafeActivities(items: ActivityItem[]) {
  return items
    .filter((item) => typeof item.title === "string" && typeof item.description === "string")
    .map((item) => ({
      ...item,
      title: item.title.trim(),
      subtitle: typeof item.subtitle === "string" && item.subtitle.trim() ? item.subtitle.trim() : null,
      description: item.description.trim(),
      category: typeof item.category === "string" && item.category.trim() ? item.category.trim() : "regular",
      tags: getStringArray(item.tags),
    }))
    .filter((item) => item.title && item.description);
}

function getSafeAchievements(items: AchievementItem[]) {
  return items
    .filter((item) => typeof item.title === "string" && typeof item.result === "string")
    .map((item) => ({
      ...item,
      title: item.title.trim(),
      organization: typeof item.organization === "string" && item.organization.trim() ? item.organization.trim() : null,
      result: item.result.trim(),
      year: Number.isInteger(item.year) ? item.year : null,
    }))
    .filter((item) => item.title && item.result);
}

function getSafeHistory(items: HistoryItem[]) {
  return items
    .filter((item) => Number.isInteger(item.year))
    .map((item) => ({
      ...item,
      generation: Number.isInteger(item.generation) ? item.generation : null,
      president: typeof item.president === "string" && item.president.trim() ? item.president.trim() : null,
      milestones: getStringArray(item.milestones),
      is_current: Boolean(item.is_current),
    }));
}

function getSafeFaqs(items: FAQItem[]) {
  return items
    .filter((item) => typeof item.question === "string" && typeof item.answer === "string")
    .map((item) => ({
      ...item,
      question: item.question.trim(),
      answer: item.answer.trim(),
    }))
    .filter((item) => item.question && item.answer);
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

    const blocks = chooseFallback(
      blocksResult.data as ContentBlock[] | null,
      fallbackCmsData.blocks
    );
    const recruitment =
      (recruitmentResult.data as RecruitmentCycle | null) ??
      fallbackRecruitment;

    return {
      settings: getSafeSettings(settingsResult.data?.value),
      pages: chooseFallback(
        pagesResult.data as ContentPage[] | null,
        fallbackCmsData.pages
      ),
      blocks: getSafeBlocks(blocks),
      recruitment: getSafeRecruitment(recruitment),
      activities: chooseFallback(
        getSafeActivities((activitiesResult.data as ActivityItem[] | null) ?? []),
        fallbackCmsData.activities
      ),
      achievements: chooseFallback(
        getSafeAchievements((achievementsResult.data as AchievementItem[] | null) ?? []),
        fallbackCmsData.achievements
      ),
      history: chooseFallback(
        getSafeHistory((historyResult.data as HistoryItem[] | null) ?? []),
        fallbackCmsData.history
      ),
      faqs: chooseFallback(getSafeFaqs((faqsResult.data as FAQItem[] | null) ?? []), fallbackCmsData.faqs),
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
