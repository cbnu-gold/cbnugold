"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import type { Stat } from "@/types";

const stats: Stat[] = [
  { number: "5", suffix: "년", label: "Since 2021" },
  { number: "8", suffix: "기", label: "현재 기수" },
  { number: "60", suffix: "+", label: "누적 멤버" },
  { number: "15", suffix: "+", label: "2025년 취업·인턴 배출" },
];

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-marble" />
      <div className="absolute inset-0 marble-texture" />
      <div className="absolute inset-0 gold-grid opacity-70" />
      {/* Subtle gold wash top-right */}
      <div
        className="absolute top-0 right-0 w-[60%] h-[50%] opacity-[0.08] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top right, rgba(201,168,76,0.4) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-16 pt-24 pb-16 md:pt-32 md:pb-20">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left — Typography block */}
          <div className="lg:col-span-7 relative">
            {/* Vertical gold line */}
            <span className="hidden lg:block absolute -left-6 top-2 h-24 w-px bg-gold/40" />

            {/* Kicker */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="font-serif italic text-gold-dark text-sm md:text-base tracking-[0.18em] uppercase mb-6 md:mb-8"
            >
              Est. 2021 — Chungbuk National University
            </motion.p>

            {/* Main heading */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="font-serif text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-light text-ink leading-[1.05] tracking-[-0.02em] mb-6"
            >
              Invest in
              <br />
              <span className="italic text-gold-dark">yourself.</span>
            </motion.h1>

            {/* Korean subheading */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg md:text-xl text-gray-500 font-light max-w-xl leading-relaxed mb-10 md:mb-12"
            >
              충북대학교 금융권 취업 동아리 <span className="text-ink font-medium">금은동</span>
              <span className="block mt-1 text-sm md:text-base text-gray-400">
                Private Wealth Study · Capital Markets · Credit Analysis
              </span>
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4"
            >
              <Link href="/join" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  지원하기
                </Button>
              </Link>
              <Link href="/about" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Explore
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Right — KPI stack */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5"
          >
            <div className="relative border border-gold-line bg-white/60 backdrop-blur-sm">
              {/* Card header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gold-line">
                <span className="font-serif italic text-gold-dark text-xs tracking-[0.2em] uppercase">
                  Key Metrics
                </span>
                <span className="text-[11px] text-gray-400 font-mono tabular-nums">
                  FY 2025
                </span>
              </div>

              {/* Stats grid */}
              <dl className="grid grid-cols-2 divide-x divide-gold-line">
                {stats.map((stat, i) => (
                  <div
                    key={stat.label}
                    className={`px-6 py-7 ${
                      i < 2 ? "border-b border-gold-line" : ""
                    }`}
                  >
                    <dt className="text-[10px] uppercase tracking-[0.15em] text-gray-400 font-medium mb-2">
                      {stat.label}
                    </dt>
                    <dd className="flex items-baseline gap-0.5">
                      <span className="text-4xl lg:text-5xl font-light text-ink font-mono tabular-nums">
                        {stat.number}
                      </span>
                      <span className="text-lg lg:text-xl text-gold font-mono">
                        {stat.suffix}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>

              {/* Card footer */}
              <div className="px-6 py-3 border-t border-gold-line text-[10px] text-gray-400 tracking-wider uppercase font-mono tabular-nums">
                Source · Internal records, 2021–2025
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gold-line" />
    </section>
  );
}
