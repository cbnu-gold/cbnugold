import Link from "next/link";
import Image from "next/image";
import { Instagram } from "lucide-react";
import type { SiteSettingsValue } from "@/types";

const navItems = [
  { href: "/", label: "홈" },
  { href: "/about", label: "소개" },
  { href: "/activity", label: "활동" },
  { href: "/join", label: "지원" },
  { href: "/join/check", label: "지원 확인" },
];

export function Footer({ settings }: { settings: SiteSettingsValue }) {
  return (
    <footer className="border-t border-ink/10 bg-marble-light">
      <div className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 md:py-16 lg:px-16">
        <div className="grid gap-9 md:grid-cols-3 lg:grid-cols-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-5">
            <Link href="/" className="inline-block mb-5">
              <Image
                src="/images/logo.png"
                alt={settings.site_title}
                width={120}
                height={37}
                className="h-9 w-auto"
              />
            </Link>
            <p className="text-base md:text-lg font-semibold text-ink leading-relaxed max-w-md mb-3">
              {settings.club_name}
            </p>
            <p className="text-sm text-ink/55 leading-relaxed max-w-md">
              {settings.hero_subtitle}
            </p>
          </div>

          {/* Explore */}
          <div className="lg:col-span-2 lg:col-start-7">
            <h4 className="mb-4 text-xs font-semibold text-ink/55">
              바로가기
            </h4>
            <ul className="space-y-3">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-ink/70 hover:text-ink transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-2">
            <h4 className="mb-4 text-xs font-semibold text-ink/55">
              연락처
            </h4>
            <p className="text-sm text-ink font-medium mb-1">{settings.contact_name}</p>
            <p className="text-sm text-ink/55 mb-2 font-mono tabular-nums">
              {settings.contact_phone}
            </p>
            <a
              href={`mailto:${settings.contact_email}`}
              className="text-sm text-ink/55 hover:text-ink transition-colors break-all"
            >
              {settings.contact_email}
            </a>
          </div>

          {/* Social */}
          <div className="lg:col-span-1 lg:col-start-12">
            <h4 className="mb-4 text-xs font-semibold text-ink/55">
              채널
            </h4>
            <div className="flex lg:flex-col items-start gap-4 lg:gap-4">
              {settings.instagram_url && (
                <a
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-ink/55 hover:text-ink transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram size={17} strokeWidth={1.5} />
                  <span className="text-xs">Instagram</span>
                </a>
              )}
              {settings.naver_cafe_url && (
                <a
                  href={settings.naver_cafe_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-ink/55 hover:text-ink transition-colors"
                  aria-label="Naver Cafe"
                >
                  <span className="font-bold text-sm w-[17px] text-center">N</span>
                  <span className="text-xs">Naver</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-ink/10 pt-6 md:mt-14">
          <p className="text-[11px] font-mono tabular-nums text-ink/40">
            © {new Date().getFullYear()} CBNU GOLD SOCIETY · ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </footer>
  );
}
