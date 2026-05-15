"use client";

import { motion } from "motion/react";
import { getConfiguredStellarNetworkLabel } from "@/lib/stellar-network";

export default function CTA() {
  const networkLabel = getConfiguredStellarNetworkLabel();
  const networkCopy = networkLabel === "any Stellar network" ? "" : ` ${networkLabel}`;

  return (
    <section className="py-24">
      <div className="mx-auto max-w-4xl px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl bg-neutral-900 p-12 text-center text-white shadow-sm md:p-16"
        >
          <div className="mx-auto inline-flex rounded-full bg-[#16a34a]/20 px-3 py-1 text-xs text-[#16a34a]">
            Try AgroShield
          </div>
          <h2 className="mt-6 font-[family-name:var(--font-manrope)] text-4xl font-extrabold md:text-5xl">
            Start protecting your harvest today
          </h2>
          <p className="mt-4 font-[family-name:var(--font-inter)] text-base text-neutral-400 md:text-lg">
            Join farmers and vendors already using AgroShield on Stellar
            {networkCopy}.
          </p>
          <button className="mt-8 rounded-full bg-green-500 px-8 py-4 text-base font-semibold text-white transition hover:bg-green-400 md:text-lg">
            Try it — it&apos;s free →
          </button>
        </motion.div>
      </div>
    </section>
  );
}
