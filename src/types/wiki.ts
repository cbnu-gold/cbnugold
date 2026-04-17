export type WikiCategory =
  | "sectors"
  | "jobs"
  | "certifications"
  | "prep"
  | "games";

export type WikiBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "deflist"; items: { term: string; desc: string }[] }
  | { type: "table"; headers: string[]; rows: string[][]; note?: string }
  | { type: "callout"; tone?: "info" | "warn"; title?: string; text: string };

export interface WikiSection {
  id: string;
  heading: string;
  blocks: WikiBlock[];
}

export interface WikiFact {
  label: string;
  value: string;
}

export interface WikiRelated {
  category: WikiCategory;
  slug: string;
  title: string;
}

export interface WikiEntry {
  slug: string;
  category: WikiCategory;
  title: string;
  titleEn?: string;
  kicker: string;
  summary: string;
  sections: WikiSection[];
  facts?: WikiFact[];
  tags?: string[];
  related?: WikiRelated[];
}

export interface WikiCategoryMeta {
  slug: WikiCategory;
  title: string;
  titleEn: string;
  kicker: string;
  description: string;
}
