import Link from "next/link";
import Image from "next/image";
import { Instagram } from "lucide-react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/activity", label: "Activity" },
  { href: "/join", label: "Join" },
];

export function Footer() {
  return (
    <footer className="border-t border-gold-line bg-marble-light">
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
            <p className="font-serif italic text-base md:text-lg text-ink leading-relaxed max-w-md mb-3">
              A student-led study of capital markets, private wealth, and credit —
              grounded in the rigor of Chungbuk National University since 2021.
            </p>
            <p className="text-sm text-gray-500 leading-relaxed max-w-md">
              충북대학교 금융권 취업 동아리. 실전 중심의 커리큘럼과 선배 네트워크로
              다음 세대 금융인을 양성합니다.
            </p>
          </div>

          {/* Explore */}
          <div className="col-span-1 lg:col-span-2 lg:col-start-7">
            <h4 className="font-serif italic text-xs text-gold-dark tracking-[0.18em] uppercase mb-5">
              Explore
            </h4>
            <ul className="space-y-3">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-gray-600 hover:text-gold-dark transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-1 lg:col-span-2">
            <h4 className="font-serif italic text-xs text-gold-dark tracking-[0.18em] uppercase mb-5">
              Contact
            </h4>
            <p className="text-sm text-ink font-medium mb-1">6대 회장 이승현</p>
            <p className="text-sm text-gray-500 mb-2 font-mono tabular-nums">
              010-2623-2004
            </p>
            <a
              href="mailto:cni351237@naver.com"
              className="text-sm text-gray-500 hover:text-gold-dark transition-colors break-all"
            >
              cni351237@naver.com
            </a>
          </div>

          {/* Social */}
          <div className="col-span-2 lg:col-span-1 lg:col-start-12">
            <h4 className="font-serif italic text-xs text-gold-dark tracking-[0.18em] uppercase mb-5">
              Follow
            </h4>
            <div className="flex lg:flex-col items-start gap-4 lg:gap-4">
              <a
                href="https://www.instagram.com/cbnu_gold/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-500 hover:text-gold-dark transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={17} strokeWidth={1.5} />
                <span className="text-xs">Instagram</span>
              </a>
              <a
                href="https://cafe.naver.com/cufaclub"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-500 hover:text-gold-dark transition-colors"
                aria-label="Naver Cafe"
              >
                <span className="font-bold text-sm w-[17px] text-center">N</span>
                <span className="text-xs">Naver</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 md:mt-20 pt-6 border-t border-gold-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[11px] text-gray-400 font-mono tabular-nums tracking-wider">
            © {new Date().getFullYear()} CBNU GOLD SOCIETY · ALL RIGHTS RESERVED.
          </p>
          <p className="text-[11px] text-gray-400 tracking-wider">
            Designed &amp; Built by <span className="text-gold-dark">이찬희</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
