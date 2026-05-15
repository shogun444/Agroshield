"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

type SectionFeatureProps = {
  label: string;
  heading: string;
  subtext: string;
  visual: ReactNode;
  reverse?: boolean;
};

export default function SectionFeature({
  label,
  heading,
  subtext,
  visual,
  reverse = false,
}: SectionFeatureProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="py-24"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 md:grid-cols-2">
        <div className={reverse ? "md:order-2" : ""}>
          <div className="inline-flex rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-neutral-500 shadow-sm">
            {label}
          </div>
          <h2 className="mt-6 font-[family-name:var(--font-manrope)] text-4xl font-semibold leading-tight tracking-tight text-neutral-900 md:text-5xl">
            {heading}
          </h2>
          <p className="mt-6 max-w-md font-[family-name:var(--font-inter)] text-lg text-neutral-500 leading-relaxed">
            {subtext}
          </p>
        </div>
        <div className={reverse ? "md:order-1" : ""}>
          <div className="rounded-[2.5rem] border border-neutral-100 bg-[#f8f5f2] p-8 shadow-sm lg:p-10">
            {visual}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
