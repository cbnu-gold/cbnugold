import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-02-20");

  return [
    { url: siteUrl, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/about`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/activity`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/join`, lastModified, changeFrequency: "weekly", priority: 0.9 },
  ];
}
