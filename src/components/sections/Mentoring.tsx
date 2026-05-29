"use client";

import { motion } from "framer-motion";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { mentoringPartners } from "@/data/mentoring";

export function Mentoring() {
  return (
    <section className="py-24 md:py-32 bg-white marble-texture">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <SectionLabel label="멘토링" className="mb-6" />
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 text-center mb-4">
            현직자 멘토링 네트워크
          </h2>
          <p className="text-gray-500 text-center mb-16">
            금융권 현직 선배들과의 직접적인 멘토링을 통해 실무를 배웁니다
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {mentoringPartners.map((partner, i) => (
            <motion.div
              key={partner.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="bg-marble-light border border-gray-200 rounded-lg p-5 text-center hover:border-gold/30 transition-colors"
            >
              <p className="font-semibold text-gray-700 text-sm">
                {partner.name}
              </p>
              <p className="text-xs text-gray-400 mt-1">{partner.type}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
