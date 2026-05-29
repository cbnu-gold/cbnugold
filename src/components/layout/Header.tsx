"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MobileNav } from "./MobileNav";
import { Menu, Instagram } from "lucide-react";
import type { SiteSettingsValue } from "@/types";

const navItems = [
  { href: "/", label: "홈" },
  { href: "/about", label: "소개" },
  { href: "/activity", label: "활동" },
];

export function Header({ settings }: { settings: SiteSettingsValue }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300 ${
          scrolled
            ? "bg-white/88 backdrop-blur-2xl border-b border-ink/10 shadow-[0_1px_0_0_rgba(14,20,32,0.03)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-[1400px] mx-auto h-full px-6 sm:px-8 lg:px-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/images/logo.png"
              alt={settings.site_title}
              width={120}
              height={37}
              className="h-8 w-auto"
              priority
            />
            <span className="hidden border-l border-ink/15 pl-3 text-[11px] font-medium text-ink/55 sm:block">
              Est. 2021
            </span>
          </Link>

          {/* Right side — Nav + Social + CTA */}
          <div className="hidden md:flex items-center gap-8">
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "text-ink font-medium"
                        : "text-ink/55 hover:text-ink font-medium"
                    }`}
                  >
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-1 left-3 right-3 h-px bg-ink" />
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="h-4 w-px bg-ink/15" />

            <div className="flex items-center gap-4">
              {settings.instagram_url && (
                <a
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative text-ink/40 hover:text-ink transition-colors"
                  aria-label="Instagram"
                  title="Instagram"
                >
                  <Instagram size={17} strokeWidth={1.5} />
                  <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-[10px] text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                    Instagram
                  </span>
                </a>
              )}
              {settings.naver_cafe_url && (
                <a
                  href={settings.naver_cafe_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold text-ink/40 transition-colors hover:text-ink"
                  aria-label="Naver Cafe"
                >
                  N
                </a>
              )}
              <Link href="/join">
                <Button size="sm">지원하기</Button>
              </Link>
            </div>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden h-10 w-10 inline-flex items-center justify-center -mr-2 text-ink/70 hover:text-ink transition-colors"
            aria-label="메뉴 열기"
          >
            <Menu size={22} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Mobile Nav */}
      <MobileNav
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        items={navItems}
        pathname={pathname}
        settings={settings}
      />
    </>
  );
}
