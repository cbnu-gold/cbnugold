"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface WikiHeroProps {
  kicker: string;
  title: string;
  titleEn?: string;
  description: string;
  breadcrumb?: { label: string; href?: string }[];
}

export function WikiHero({
  kicker,
  title,
  titleEn,
  description,
  breadcrumb,
}: WikiHeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-marble" />
      <div className="absolute inset-0 marble-texture" />
      <div className="absolute inset-0 gold-grid opacity-40" />

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-16 pt-28 pb-14 md:pt-36 md:pb-20">
        <div className="max-w-3xl mx-auto text-center">
          {breadcrumb && breadcrumb.length > 0 && (
            <motion.nav
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-center gap-2 font-mono tabular-nums text-[11px] text-ink/50 tracking-wider uppercase mb-6"
            >
              {breadcrumb.map((b, i) => (
                <span key={i} className="flex items-center gap-2">
                  {b.href ? (
                    <Link href={b.href} className="hover:text-ink transition-colors">
                      {b.label}
                    </Link>
                  ) : (
                    <span className="text-ink/70">{b.label}</span>
                  )}
                  {i < breadcrumb.length - 1 && <span className="text-ink/30">/</span>}
                </span>
              ))}
            </motion.nav>
          )}

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="font-serif italic text-ink/70 text-sm md:text-base tracking-[0.22em] uppercase mb-6"
          >
            {kicker}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-5xl lg:text-6xl font-light text-ink leading-[1.05] tracking-[-0.02em] mb-5"
          >
            {title}
            {titleEn && (
              <span className="block mt-2 font-serif italic text-ink/60 text-2xl sm:text-3xl lg:text-4xl">
                {titleEn}
              </span>
            )}
          </motion.h1>

          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="h-px w-16 bg-ink mx-auto my-7 origin-center"
          />

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-base md:text-lg text-ink/70 leading-relaxed max-w-2xl mx-auto"
          >
            {description}
          </motion.p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-ink/10" />
    </section>
  );
}
