"use client";

import { motion } from "motion/react";

export default function CTA() {
  return (
    <section className="py-24 bg-[#F5F0EB]">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-[2.5rem] bg-neutral-900 p-12 text-center text-white shadow-xl shadow-neutral-900/10 md:p-20 relative overflow-hidden"
        >
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[40%] bg-green-500/20 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="mx-auto inline-flex rounded-full bg-[#16a34a]/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#16a34a]">
              Try AgroShield
            </div>
            <h2 className="mt-8 font-[family-name:var(--font-manrope)] text-4xl font-semibold md:text-6xl leading-tight">
              Start protecting your harvest today
            </h2>
            <p className="mt-6 mx-auto max-w-2xl font-[family-name:var(--font-inter)] text-base text-neutral-400 md:text-lg">
              Join farmers and vendors already using AgroShield on Stellar testnet.
            </p>
            <button className="mt-10 rounded-xl bg-green-500 px-8 py-4 text-base font-semibold text-white transition hover:bg-green-400 shadow-lg shadow-green-500/30 active:scale-95">
              Try it — it&apos;s free →
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
