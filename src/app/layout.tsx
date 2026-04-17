import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  metadataBase: new URL("https://cbnugold.vercel.app"),
  title: {
    default: "금은동 | 충북대학교 금융권 취업 동아리",
    template: "%s | 금은동",
  },
  description:
    "충북대학교 금융권 취업 동아리 금은동입니다. 신문 스크랩, 리포트 분석, 현직자 멘토링, 직무분석 경진대회 등 실전 금융 커리어를 준비합니다.",
  keywords: [
    "충북대",
    "금융 동아리",
    "금은동",
    "취업 동아리",
    "금융권",
    "CBNU GOLD",
    "충북대학교 동아리",
    "금융권 취업",
  ],
  openGraph: {
    title: "금은동 | 충북대학교 금융권 취업 동아리",
    description:
      "충북대학교 금융권 취업 동아리 금은동. Invest in yourself. Since 2021.",
    url: "https://cbnugold.vercel.app",
    siteName: "금은동",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/images/logo.png",
        width: 256,
        height: 256,
        alt: "금은동 - 충북대학교 금융권 취업 동아리",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "금은동 | 충북대학교 금융권 취업 동아리",
    description:
      "충북대학교 금융권 취업 동아리 금은동. Invest in yourself. Since 2021.",
    images: ["/images/logo.png"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: "/images/logo.png",
    apple: "/images/logo.png",
  },
  alternates: {
    canonical: "https://cbnugold.vercel.app",
  },
  verification: {
    google: "PBjLy42PMYDwpa4eoGQ-2TbsgOYJmzy4IfD19eoPBRo",
    other: {
      "naver-site-verification": ["a616d0a808c11b029e2283d8060ceb73fe7a4ad1"],
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard (Korean) */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* Inter + JetBrains Mono (English / Numbers) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased marble-texture">
        <JsonLd />
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
