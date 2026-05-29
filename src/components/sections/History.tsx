"use client";

import { motion } from "framer-motion";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { history } from "@/data/history";

export function History() {
  return (
    <section className="py-24 md:py-32 bg-marble-light">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <SectionLabel label="연혁" className="mb-6" />
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 text-center mb-16">
            금은동의 발자취
          </h2>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[28px] md:left-[40px] top-0 bottom-0 w-px bg-gold/25" />

          <div className="space-y-10">
            {history.map((entry, i) => (
              <motion.div
                key={entry.year}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative flex gap-6 md:gap-8"
              >
                {/* Node */}
                <div className="relative z-10 flex flex-col items-center pt-1">
                  <div
                    className={`w-3.5 h-3.5 rounded-full ${
                      entry.isCurrent
                        ? "bg-gold ring-4 ring-gold/20"
                        : "bg-gold"
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 pb-2">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-2xl font-bold font-mono text-gold">
                      {entry.year}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">
                      {entry.generation}대 {entry.president}
                    </span>
                    {entry.isCurrent && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold-dark font-medium">
                        현재
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {entry.milestones.map((ms) => (
                      <li key={ms} className="text-sm text-gray-500 flex items-start gap-2">
                        <span className="text-gold/50 mt-1.5 shrink-0">·</span>
                        {ms}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
