"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { WikiCategoryMeta } from "@/types/wiki";

interface WikiCategoryCardProps {
  category: WikiCategoryMeta;
  index: number;
}

export function WikiCategoryCard({ category, index }: WikiCategoryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/wiki/${category.slug}`}
        className="group relative block h-full bg-white border border-ink/12 p-6 sm:p-7 transition-all duration-500 hover:border-ink/30 hover:bg-marble-light"
      >
        <span className="absolute top-0 left-0 h-px bg-ink w-0 group-hover:w-full transition-[width] duration-700 ease-out" />

        <div className="flex items-center justify-between mb-5">
          <span className="font-mono tabular-nums text-[11px] text-ink/50 tracking-[0.2em] uppercase">
            0{index + 1}
          </span>
          <span className="font-serif italic text-ink/60 text-[11px] tracking-[0.22em] uppercase">
            {category.kicker}
          </span>
        </div>

        <h3 className="text-2xl font-light text-ink leading-tight tracking-tight mb-2">
          {category.title}
        </h3>
        <p className="font-serif italic text-ink/60 text-sm tracking-wide mb-5">
          {category.titleEn}
        </p>

        <div className="h-px w-10 bg-ink/20 group-hover:bg-ink group-hover:w-20 transition-all duration-500 mb-5" />

        <p className="text-sm text-ink/70 leading-relaxed">
          {category.description}
        </p>

        <div className="mt-6 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-ink/50 group-hover:text-ink transition-colors">
          <span>Explore</span>
          <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </div>
      </Link>
    </motion.div>
  );
}
