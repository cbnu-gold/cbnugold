import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPublicCmsData } from "@/lib/cms-public";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { settings } = await getPublicCmsData();

  return (
    <html lang="ko" className={`${inter.variable} ${jetBrainsMono.variable} ${fraunces.variable}`}>
      <head>
        {/* Pretendard (Korean) */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased marble-texture">
        <JsonLd />
        <Header settings={settings} />
        <main className="min-h-screen">{children}</main>
        <Footer settings={settings} />
      </body>
    </html>
  );
}
