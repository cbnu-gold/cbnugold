import type { Metadata } from "next";
import { getPublicPage } from "@/lib/cms-public";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublicPage("join");
  const title = page?.title ?? "신입부원 모집";
  const description =
    page?.description ?? "금은동 신입부원 모집 일정, 지원 자격, 제출 서류를 안내합니다.";

  return {
    title,
    description,
    openGraph: {
      title: `${title} | 금은동`,
      description,
      url: "https://cbnugold.vercel.app/join",
    },
    alternates: {
      canonical: "https://cbnugold.vercel.app/join",
    },
  };
}

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
