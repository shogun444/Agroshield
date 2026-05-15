"use client";

import { motion } from "motion/react";

const cards = [
  {
    title: "AI Crop Diagnosis",
    description:
      "Upload a photo of your diseased crop. Our AI instantly identifies the disease, severity, and recommended treatment.",
    detail: "Diagnosis: Leaf Blight · 92% confidence · Urgency: High",
    span: "md:col-span-2",
  },
  {
    title: "Vendor Marketplace",
    description: "Local agronomists and pesticide vendors bid to help. You choose the best offer.",
    detail: "Bid list: Kofi Agro · $48 · 2-day delivery",
  },
  {
    title: "Trustless Escrow",
    description: "Funds locked in smart contract. Released only when treatment is confirmed.",
    detail: "LOCKED → DELIVERED → RELEASED",
  },
  {
    title: "Dispute Resolution",
    description: "If something goes wrong, our platform mediates. No one loses money unfairly.",
    detail: "Case #2041 · Dispute opened → Resolved",
    span: "md:col-span-2",
  },
];

export default function Bento() {
  return (
    <section id="how" className="py-24 bg-[#f8f5f2]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-neutral-500 shadow-sm"
          >
            🌿 How it works
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 font-[family-name:var(--font-manrope)] text-4xl font-semibold text-neutral-900 md:text-5xl"
          >
            From sick leaf to treatment in minutes
          </motion.h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {cards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.12 }}
              className={`rounded-[2rem] border border-neutral-100 bg-white p-8 shadow-sm transition hover:shadow-md ${card.span ?? ""}`}
            >
              <div className="inline-flex rounded-xl bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600 mb-6">
                {card.detail}
              </div>
              <h3 className="font-[family-name:var(--font-manrope)] text-2xl font-semibold text-neutral-900">
                {card.title}
              </h3>
              <p className="mt-3 text-base text-neutral-500 leading-relaxed">{card.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
