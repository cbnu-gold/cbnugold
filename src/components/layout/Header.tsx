"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MobileNav } from "./MobileNav";
import { Menu, Instagram } from "lucide-react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/activity", label: "Activity" },
];

export function Header() {
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
            ? "bg-white/85 backdrop-blur-2xl border-b border-gold-line shadow-[0_1px_0_0_rgba(201,168,76,0.08)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-[1400px] mx-auto h-full px-6 sm:px-8 lg:px-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/images/logo.png"
              alt="금은동"
              width={120}
              height={37}
              className="h-8 w-auto"
              priority
            />
            <span className="hidden sm:block font-serif italic text-[11px] text-gold-dark tracking-[0.18em] uppercase border-l border-gold-line pl-3">
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
                    className={`relative px-3 py-2 text-[13px] uppercase tracking-[0.12em] transition-colors ${
                      isActive
                        ? "text-gold-dark font-medium"
                        : "text-gray-500 hover:text-gold-dark font-medium"
                    }`}
                  >
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-1 left-3 right-3 h-px bg-gold" />
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="h-4 w-px bg-gold-line" />

            <div className="flex items-center gap-4">
              <a
                href="https://www.instagram.com/cbnu_gold/"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative text-gray-400 hover:text-gold-dark transition-colors"
                aria-label="Instagram"
                title="@cbnu_gold"
              >
                <Instagram size={17} strokeWidth={1.5} />
                <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 rounded bg-ink px-2 py-1 text-[10px] text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 whitespace-nowrap">
                  @cbnu_gold
                </span>
              </a>
              <a
                href="https://cafe.naver.com/cufaclub"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gold-dark transition-colors text-sm font-bold"
                aria-label="Naver Cafe"
              >
                N
              </a>
              <Link href="/join">
                <Button size="sm">지원하기</Button>
              </Link>
            </div>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden h-10 w-10 inline-flex items-center justify-center -mr-2 text-gray-600 hover:text-gold-dark transition-colors"
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
      />
    </>
  );
}
