"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const faqs = [
  {
    question: "How does the AI diagnosis work?",
    answer: "You simply upload a clear photo of your affected crop. Our AI instantly analyzes the image, identifies the disease with a confidence score, and recommends specific treatments and pesticides.",
  },
  {
    question: "Is my payment safe?",
    answer: "Yes. Payments are held in a secure trustless escrow smart contract on the Stellar network. The vendor only gets paid when you explicitly confirm that the treatment was delivered successfully.",
  },
  {
    question: "What happens if a vendor doesn't deliver?",
    answer: "If the treatment is not delivered or fails to meet the agreed terms, you can raise a dispute. The funds remain locked in the smart contract until the dispute is resolved, ensuring you don't lose your money unfairly.",
  },
  {
    question: "Who are the vendors?",
    answer: "Vendors are local agronomists and verified pesticide suppliers. When you post a diagnosed case to the marketplace, they can view it and submit competitive bids with pricing and delivery times.",
  },
  {
    question: "Do I need cryptocurrency to use AgroShield?",
    answer: "We use USDC on the Stellar network to ensure fast, low-cost, and secure transactions. You can easily fund your wallet and transact in digital dollars without worrying about crypto volatility.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 bg-[#F5F0EB]">
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex rounded-full border border-neutral-200 bg-[#FBF9F7] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-neutral-500 shadow-sm"
          >
            🤔 FAQs
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 font-[family-name:var(--font-manrope)] text-4xl font-semibold text-neutral-900 md:text-5xl"
          >
            Common questions
          </motion.h2>
        </div>

        <div className="mt-16 space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`overflow-hidden rounded-2xl border transition-colors ${
                  isOpen ? "border-neutral-100 bg-[#FBF9F7] shadow-sm" : "border-transparent bg-[#FBF9F7] hover:bg-[[#F5F0EB]]"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left"
                >
                  <span className="font-[family-name:var(--font-manrope)] text-lg font-semibold text-neutral-900">
                    {faq.question}
                  </span>
                  <span className={`ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform ${isOpen ? "rotate-180 bg-[#FBF9F7]" : "bg-[#FBF9F7]"}`}>
                    <svg className="h-4 w-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-5 text-base text-neutral-500 leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
