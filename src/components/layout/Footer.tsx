import Link from "next/link";
import Image from "next/image";
import { Instagram } from "lucide-react";

const navItems = [
  { href: "/", label: "홈" },
  { href: "/about", label: "소개" },
  { href: "/activity", label: "활동" },
  { href: "/join", label: "지원" },
];

export function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-marble-light">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-16 py-16 md:py-20">
        {/* Top grid — 4 columns */}
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-5">
            <Link href="/" className="inline-block mb-5">
              <Image
                src="/images/logo.png"
                alt="금은동"
                width={120}
                height={37}
                className="h-9 w-auto"
              />
            </Link>
            <p className="text-base md:text-lg font-semibold text-ink leading-relaxed max-w-md mb-3">
              충북대학교 금융권 취업 동아리 금은동
            </p>
            <p className="text-sm text-ink/55 leading-relaxed max-w-md">
              신문 스크랩, 리포트 분석, 세일즈 페어, 멘토링을 진행합니다.
            </p>
          </div>

          {/* Explore */}
          <div className="col-span-1 lg:col-span-2 lg:col-start-7">
            <h4 className="font-serif italic text-xs text-ink/55 tracking-[0.18em] uppercase mb-5">
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
          <div className="col-span-1 lg:col-span-2">
            <h4 className="font-serif italic text-xs text-ink/55 tracking-[0.18em] uppercase mb-5">
              연락처
            </h4>
            <p className="text-sm text-ink font-medium mb-1">6대 회장 이승현</p>
            <p className="text-sm text-ink/55 mb-2 font-mono tabular-nums">
              010-2623-2004
            </p>
            <a
              href="mailto:cni351237@naver.com"
              className="text-sm text-ink/55 hover:text-ink transition-colors break-all"
            >
              cni351237@naver.com
            </a>
          </div>

          {/* Social */}
          <div className="col-span-2 lg:col-span-1 lg:col-start-12">
            <h4 className="font-serif italic text-xs text-ink/55 tracking-[0.18em] uppercase mb-5">
              채널
            </h4>
            <div className="flex lg:flex-col items-start gap-4 lg:gap-4">
              <a
                href="https://www.instagram.com/cbnu_gold/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-ink/55 hover:text-ink transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={17} strokeWidth={1.5} />
                <span className="text-xs">Instagram</span>
              </a>
              <a
                href="https://cafe.naver.com/cufaclub"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-ink/55 hover:text-ink transition-colors"
                aria-label="Naver Cafe"
              >
                <span className="font-bold text-sm w-[17px] text-center">N</span>
                <span className="text-xs">Naver</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 md:mt-20 pt-6 border-t border-ink/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[11px] text-ink/40 font-mono tabular-nums tracking-wider">
            © {new Date().getFullYear()} CBNU GOLD SOCIETY · ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </footer>
  );
}
