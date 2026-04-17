"use client";

import { motion } from "framer-motion";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Badge } from "@/components/ui/Badge";
import { activities } from "@/data/activities";

export function WhatWeDo() {
  return (
    <section className="py-28 md:py-40 bg-marble-light">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-16">
        {/* Header */}
        <div className="grid lg:grid-cols-12 gap-10 mb-16 md:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5"
          >
            <SectionLabel label="What We Do" className="mb-6" />
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light text-ink leading-[1.1] tracking-[-0.02em]">
              금은동의
              <br />
              <span className="italic text-gold-dark">핵심 활동.</span>
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 lg:col-start-7 flex items-end"
          >
            <p className="text-base md:text-lg text-gray-500 font-light leading-relaxed border-l border-gold-line pl-6">
              실전 중심의 커리큘럼으로, 금융권 채용 프로세스 전반을 체계적으로 준비합니다.
              매주 진행되는 스터디, 멘토링, 경진대회를 통해 지식과 경험을 동시에 축적합니다.
            </p>
          </motion.div>
        </div>

        {/* Product cards */}
        <div className="grid md:grid-cols-3 border-t border-gold-line">
          {activities.map((activity, i) => (
            <motion.article
              key={activity.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className={`group relative bg-marble-light hover:bg-white transition-colors duration-500 border-b border-gold-line ${
                i < 2 ? "md:border-r md:border-gold-line" : ""
              }`}
            >
              {/* Top gold bar animation */}
              <span className="absolute top-0 left-0 h-px bg-gold w-0 group-hover:w-full transition-[width] duration-500 ease-out" />

              <div className="px-6 md:px-8 py-10 md:py-12 min-h-[360px] flex flex-col">
                {/* Number */}
                <div className="flex items-center justify-between mb-8">
                  <span className="font-serif italic text-gold-dark text-3xl md:text-4xl tabular-nums font-light">
                    {activity.number}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-mono">
                    {activity.subtitle}
                  </span>
                </div>

                {/* Divider */}
                <div className="h-px bg-gold-line mb-6" />

                {/* Title */}
                <h3 className="text-xl md:text-2xl font-medium text-ink mb-4 tracking-tight">
                  {activity.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-500 leading-relaxed mb-8 flex-1">
                  {activity.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {activity.tags.map((tag) => (
                    <Badge key={tag} variant="tag">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
