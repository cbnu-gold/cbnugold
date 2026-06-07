import { X, Instagram } from "lucide-react";
import type { SiteSettingsValue } from "@/types";

interface MobileNavProps {
  items: { href: string; label: string }[];
  pathname: string;
  settings: SiteSettingsValue;
}

export function MobileNav({ items, pathname, settings }: MobileNavProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="모바일 메뉴"
      className="fixed inset-0 z-[60] hidden flex-col items-center justify-center gap-8 bg-white/98 backdrop-blur-xl md:hidden peer-checked:flex"
    >
      <label
        htmlFor="mobile-nav-toggle"
        className="absolute top-5 right-6 cursor-pointer text-gray-500 transition-colors hover:text-gold"
        aria-label="메뉴 닫기"
        role="button"
      >
        <X size={28} />
      </label>

      <nav className="flex flex-col items-center gap-6">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              className={`text-2xl font-semibold transition-colors ${
                isActive ? "text-gold" : "text-gray-700 hover:text-gold"
              }`}
            >
              {item.label}
            </a>
          );
        })}
      </nav>

      <div className="flex items-center gap-5">
        {settings.instagram_url && (
          <a
            href={settings.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 transition-colors hover:text-gold"
            aria-label="Instagram"
          >
            <Instagram size={22} />
          </a>
        )}
        {settings.naver_cafe_url && (
          <a
            href={settings.naver_cafe_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-bold text-gray-400 transition-colors hover:text-gold"
            aria-label="Naver Cafe"
          >
            N
          </a>
        )}
      </div>

      <a
        href="/join"
        className="mt-4 inline-flex w-64 items-center justify-center rounded-lg border border-ink bg-ink px-8 py-4 text-base font-medium text-white shadow-[0_6px_18px_-10px_rgba(14,20,32,0.5)] transition-all duration-300 hover:bg-navy-800 active:bg-navy-900"
      >
        지원하기
      </a>
    </div>
  );
}
