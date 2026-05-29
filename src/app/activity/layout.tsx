import type { Metadata } from "next";
import { getPublicPage } from "@/lib/cms-public";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublicPage("activity");
  const title = page?.title ?? "활동 소개";
  const description =
    page?.description ?? "금은동의 정규 활동과 특별 활동을 소개합니다.";

  return {
    title,
    description,
    openGraph: {
      title: `${title} | 금은동`,
      description,
      url: "https://cbnugold.vercel.app/activity",
    },
    alternates: {
      canonical: "https://cbnugold.vercel.app/activity",
    },
  };
}

export default function ActivityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
