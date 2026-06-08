"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { JsonLd } from "@/components/seo/JsonLd";
import type { SiteSettingsValue } from "@/types";

export function AppChrome({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings: SiteSettingsValue;
}) {
  const pathname = usePathname();
  const isAdminSurface = pathname.startsWith("/admin");

  if (isAdminSurface) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <JsonLd settings={settings} />
      <Header settings={settings} />
      <main className="min-h-screen">{children}</main>
      <Footer settings={settings} />
    </>
  );
}
