"use client";

import { motion } from "motion/react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay },
  }),
};

export default function Hero() {
  return (
    <section className="pt-32 pb-24 text-center">
      <div className="mx-auto max-w-4xl px-6 flex flex-col items-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-600 shadow-sm transition hover:bg-neutral-50 cursor-pointer"
        >
          Now live on Stellar Testnet <span className="text-neutral-400">→</span>
        </motion.div>
        <motion.h1
          initial="hidden"
          animate="visible"
          custom={0.15}
          variants={fadeUp}
          className="mt-8 font-[family-name:var(--font-manrope)] text-5xl font-semibold tracking-tight text-neutral-900 md:text-7xl leading-[1.1]"
        >
          Discover active crop cases and verified vendor opportunities.
        </motion.h1>
        <motion.p
          initial="hidden"
          animate="visible"
          custom={0.3}
          variants={fadeUp}
          className="mt-6 max-w-2xl font-[family-name:var(--font-inter)] text-base text-neutral-500 md:text-xl leading-relaxed"
        >
          AgroShield connects farmers with local agronomists through AI-powered diagnosis and
          trustless milestone escrow. Funds only release when treatment is confirmed.
        </motion.p>
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0.45}
          variants={fadeUp}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            className="rounded-xl bg-neutral-900 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800 md:text-base flex items-center gap-2 shadow-lg shadow-neutral-900/20"
            href="/diagnose"
          >
            Upload a crop photo <span className="opacity-70">→</span>
          </a>
          <a className="flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-neutral-700 transition hover:text-neutral-900 md:text-base" href="#how">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M8 5v14l11-7z"/></svg>
            See how it works
          </a>
        </motion.div>
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0.6}
          variants={fadeUp}
          className="mt-12 flex flex-col items-center gap-2"
        >
          <div className="flex text-yellow-500 text-sm">
            ★★★★★
          </div>
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-widest">
            4.9 rating · Built for farmers in emerging markets
          </p>
        </motion.div>
      </div>
    </section>
  );
}
