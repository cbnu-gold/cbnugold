import type { Metadata } from "next";
import { getPublicPage } from "@/lib/cms-public";
import { recruitingShareImage, siteUrl } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublicPage("about");
  const title = page?.title ?? "동아리 소개";
  const description =
    page?.description ??
    "금은동의 운영 방향, 조직 구조, 학기별 활동을 소개합니다.";

  return {
    title,
    description,
    openGraph: {
      title: `${title} | 금은동`,
      description,
      url: `${siteUrl}/about`,
      images: [recruitingShareImage],
    },
    twitter: {
      title: `${title} | 금은동`,
      description,
      images: [recruitingShareImage.url],
    },
    alternates: {
      canonical: `${siteUrl}/about`,
    },
  };
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
