"use client";

import { motion } from "framer-motion";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { placements, awards } from "@/data/achievements";

const typeAccent: Record<string, string> = {
  은행: "text-blue-900",
  증권: "text-purple-900",
  보험: "text-emerald-900",
  공기업: "text-amber-900",
  정부: "text-slate-900",
};

const kpis = [
  { value: "11", label: "취업·인턴 배출", sub: "FY 2025" },
  { value: "05", label: "외부 수상 실적", sub: "Competitions" },
  { value: "05", label: "활동 연차", sub: "Since 2021" },
];

export function Achievements() {
  return (
    <section className="py-28 md:py-40 bg-white relative">
      <div className="absolute inset-0 marble-texture opacity-60 pointer-events-none" />

      <div className="relative max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mb-14 md:mb-20"
        >
          <SectionLabel label="Track Record" className="mb-6" />
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-light text-ink leading-[1.1] tracking-[-0.02em] mb-5">
            2025년 주요 성과<span className="text-gold-dark">.</span>
          </h2>
          <p className="text-base md:text-lg text-ink/60 font-light leading-relaxed">
            금은동 출신 멤버들의 취업·인턴 배출 내역과 외부 경진대회 수상 실적입니다.
          </p>
        </motion.div>

        {/* KPI row */}
        <motion.dl
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-3 border-y border-ink/15 mb-20 md:mb-28"
        >
          {kpis.map((kpi, i) => (
            <div
              key={kpi.label}
              className={`py-10 md:py-14 px-4 md:px-8 ${
                i < 2 ? "border-r border-ink/15" : ""
              }`}
            >
              <dd className="font-mono tabular-nums text-5xl md:text-7xl font-light text-ink mb-3 leading-none">
                {kpi.value}
              </dd>
              <dt className="text-xs md:text-sm text-ink font-medium mb-1">
                {kpi.label}
              </dt>
              <p className="font-serif italic text-[11px] md:text-xs text-ink/45 tracking-wider uppercase">
                {kpi.sub}
              </p>
            </div>
          ))}
        </motion.dl>

        {/* Placements */}
        <div className="mb-20 md:mb-28">
          <div className="flex items-end justify-between mb-8 pb-4 border-b border-ink/15">
            <div>
              <p className="font-serif italic text-ink/55 text-xs md:text-sm tracking-[0.18em] uppercase mb-2">
                01 — Placements
              </p>
              <h3 className="text-xl md:text-2xl font-medium text-ink">
                취업·인턴 실적
              </h3>
            </div>
            <span className="text-xs text-ink/40 font-mono tabular-nums">
              {placements.length.toString().padStart(2, "0")} records
            </span>
          </div>

          <ul>
            {placements.map((p, i) => (
              <motion.li
                key={`${p.company}-${p.position}`}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.04 }}
                className="group grid grid-cols-12 gap-4 items-center py-5 border-b border-ink/10 hover:bg-marble-light/60 transition-colors duration-300"
              >
                <span className="col-span-1 text-xs text-ink/35 font-mono tabular-nums">
                  {(i + 1).toString().padStart(2, "0")}
                </span>
                <span
                  className={`col-span-3 md:col-span-2 text-[11px] md:text-xs font-medium tracking-wider ${
                    typeAccent[p.type] ?? "text-ink"
                  }`}
                >
                  {p.type}
                </span>
                <span className="col-span-5 md:col-span-5 text-sm md:text-base font-medium text-ink">
                  {p.company}
                </span>
                <span className="col-span-3 md:col-span-4 text-xs md:text-sm text-ink/55 text-right md:text-left font-light">
                  {p.position}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Awards */}
        <div>
          <div className="flex items-end justify-between mb-8 pb-4 border-b border-ink/15">
            <div>
              <p className="font-serif italic text-ink/55 text-xs md:text-sm tracking-[0.18em] uppercase mb-2">
                02 — Awards
              </p>
              <h3 className="text-xl md:text-2xl font-medium text-ink">
                수상 실적
              </h3>
            </div>
            <span className="text-xs text-ink/40 font-mono tabular-nums">
              {awards.length.toString().padStart(2, "0")} records
            </span>
          </div>

          <ul>
            {awards.map((award, i) => (
              <motion.li
                key={award.title}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group flex items-center gap-6 py-5 border-b border-ink/10 hover:bg-marble-light/60 transition-colors duration-300"
              >
                <span className="text-xs text-ink/35 font-mono tabular-nums w-8">
                  {(i + 1).toString().padStart(2, "0")}
                </span>
                <span className="flex-1 text-sm md:text-base font-medium text-ink">
                  {award.title}
                </span>
                <span className="text-sm md:text-base text-ink font-medium whitespace-nowrap">
                  {award.result}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
