import type {
  ActivityItem,
  AchievementItem,
  ContentBlock,
  ContentPage,
  FAQItem,
  HistoryItem,
  RecruitmentCycle,
} from "@/types";

export type PublicCmsDraftResources = {
  pages: ContentPage[];
  blocks: ContentBlock[];
  recruitment: RecruitmentCycle[];
  activities: ActivityItem[];
  achievements: AchievementItem[];
  history: HistoryItem[];
  faqs: FAQItem[];
};

export type PreservePublicCmsIdsResult = {
  resources: PublicCmsDraftResources;
  matchedCount: number;
};

type KeyedItem = {
  id?: string;
};

function keyPart(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function identityKey(parts: unknown[]) {
  const normalized = parts.map(keyPart);
  if (normalized.some((part) => !part)) return "";
  return normalized.join("\u001F");
}

function attachExistingIds<T extends KeyedItem>(
  incoming: T[],
  existing: T[],
  getKey: (item: T) => string
) {
  const existingByKey = new Map<string, string>();
  for (const item of existing) {
    const key = getKey(item);
    if (key && item.id && !existingByKey.has(key)) existingByKey.set(key, item.id);
  }

  let matchedCount = 0;
  const usedIds = new Set(incoming.map((item) => item.id).filter((id): id is string => Boolean(id)));
  const items = incoming.map((item) => {
    if (item.id) return item;

    const existingId = existingByKey.get(getKey(item));
    if (!existingId || usedIds.has(existingId)) return item;

    matchedCount += 1;
    usedIds.add(existingId);
    return { ...item, id: existingId };
  });

  return { items, matchedCount };
}

export function preserveExistingPublicCmsIds(
  draft: PublicCmsDraftResources,
  existing: PublicCmsDraftResources
): PreservePublicCmsIdsResult {
  const pages = attachExistingIds(draft.pages, existing.pages, (item) => identityKey([item.slug]));
  const blocks = attachExistingIds(draft.blocks, existing.blocks, (item) =>
    identityKey([item.page_slug, item.block_key])
  );
  const recruitment = attachExistingIds(draft.recruitment, existing.recruitment, (item) =>
    identityKey([item.generation])
  );
  const activities = attachExistingIds(draft.activities, existing.activities, (item) =>
    identityKey([item.category, item.title])
  );
  const achievements = attachExistingIds(draft.achievements, existing.achievements, (item) =>
    identityKey([item.kind, item.title, item.result])
  );
  const history = attachExistingIds(draft.history, existing.history, (item) => identityKey([item.year]));
  const faqs = attachExistingIds(draft.faqs, existing.faqs, (item) => identityKey([item.question]));

  return {
    resources: {
      pages: pages.items,
      blocks: blocks.items,
      recruitment: recruitment.items,
      activities: activities.items,
      achievements: achievements.items,
      history: history.items,
      faqs: faqs.items,
    },
    matchedCount:
      pages.matchedCount +
      blocks.matchedCount +
      recruitment.matchedCount +
      activities.matchedCount +
      achievements.matchedCount +
      history.matchedCount +
      faqs.matchedCount,
  };
}
