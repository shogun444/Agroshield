"use client";

import { motion } from "motion/react";
import { getConfiguredStellarNetworkLabel } from "@/lib/stellar-network";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay },
  }),
};

export default function Hero() {
  const networkLabel = getConfiguredStellarNetworkLabel();
  const networkCopy = networkLabel === "any Stellar network" ? "" : ` ${networkLabel}`;

  return (
    <section className="pt-32 pb-24">
      <div className="mx-auto max-w-4xl px-6">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-xs text-neutral-500 shadow-sm"
        >
          Now live on Stellar{networkCopy} →
        </motion.div>
        <motion.h1
          initial="hidden"
          animate="visible"
          custom={0.15}
          variants={fadeUp}
          className="mt-6 font-[family-name:var(--font-manrope)] text-5xl font-extrabold tracking-tight text-neutral-900 md:text-6xl"
        >
          Discover active crop cases and verified vendor opportunities.
        </motion.h1>
        <motion.p
          initial="hidden"
          animate="visible"
          custom={0.3}
          variants={fadeUp}
          className="mt-5 max-w-xl font-[family-name:var(--font-inter)] text-base text-neutral-500 md:text-lg"
        >
          AgroShield connects farmers with local agronomists through AI-powered diagnosis and
          trustless milestone escrow. Funds only release when treatment is confirmed.
        </motion.p>
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0.45}
          variants={fadeUp}
          className="mt-8 flex flex-wrap items-center gap-4"
        >
          <a
            className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white md:text-base"
            href="/diagnose"
          >
            Upload a crop photo →
          </a>
          <a className="text-sm text-neutral-500 underline md:text-base" href="#how">
            See how it works
          </a>
        </motion.div>
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0.6}
          variants={fadeUp}
          className="mt-8 text-sm text-neutral-500"
        >
          4.9 rating ★★★★★ · Built for farmers in emerging markets
        </motion.div>
      </div>
    </section>
  );
}
