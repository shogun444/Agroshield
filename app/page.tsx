"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Bento from "@/components/Bento";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import SectionFeature from "@/components/marketplace/SectionFeature";
import FarmerCaseVisual from "@/components/marketplace/FarmerCaseVisual";
import VendorBidVisual from "@/components/marketplace/VendorBidVisual";
import EscrowVisual from "@/components/marketplace/EscrowVisual";

export default function Home() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <Nav />
      <Hero />
      <Bento />
      <SectionFeature
        label="🌾 For Farmers"
        heading="Upload. Diagnose. Get treated."
        subtext="No more guessing what's wrong with your crops. Get expert AI diagnosis instantly and only pay when treatment is confirmed delivered."
        visual={<FarmerCaseVisual />}
      />
      <SectionFeature
        label="🏪 For Vendors"
        heading="Bid on cases. Get paid guaranteed."
        subtext="Browse open cases from farmers near you. Submit your proposal and price. Smart contract guarantees payment when you deliver."
        visual={<VendorBidVisual />}
        reverse
      />
      <SectionFeature
        label="🔒 Trustless Escrow"
        heading="Funds locked until treatment works."
        subtext="Built on Stellar using Trustless Work. Escrow holds funds in a smart contract — released automatically when farmer confirms treatment."
        visual={<EscrowVisual />}
      />
      <CTA />

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="flex flex-col gap-8 rounded-2xl bg-white border border-neutral-200 p-8 shadow-sm md:p-10">
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              In Partnership with
              <a
                href="https://trustlesswork.com"
                target="_blank"
                rel="noreferrer noopener"
                className="ml-3 underline decoration-emerald-500 decoration-2 underline-offset-4"
              >
                Trustless Work
              </a>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-neutral-500">How it works</p>
              <h2 className="mt-3 text-3xl font-semibold text-neutral-900 sm:text-4xl">A streamlined workflow for farmers and vendors</h2>
              <p className="mt-4 max-w-2xl text-base text-neutral-600">
                From diagnosis to delivery, AgroShield makes it easy to manage crop treatment with escrow-backed trust and transparent outcomes.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-neutral-200 bg-[#FAF7F3] p-6">
              <div className="text-sm font-semibold text-emerald-700">1. Submit your case</div>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                Farmers upload photos and symptoms, then receive a fast AI diagnosis tailored to their crop and local conditions.
              </p>
            </div>
            <div className="rounded-3xl border border-neutral-200 bg-[#FAF7F3] p-6">
              <div className="text-sm font-semibold text-emerald-700">2. Vendor proposal</div>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                Vendors review open cases, submit bids, and lock funds into escrow so everyone can move forward with confidence.
              </p>
            </div>
            <div className="rounded-3xl border border-neutral-200 bg-[#FAF7F3] p-6">
              <div className="text-sm font-semibold text-emerald-700">3. Confirm delivery</div>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                When treatment is confirmed, the escrow releases payment automatically and the case is completed transparently.
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.24em] text-neutral-500">FAQ</p>
              <h3 className="text-4xl font-semibold tracking-tight text-neutral-900">Frequently Asked Questions</h3>
              <p className="max-w-xl text-base text-neutral-600">
                Get quick answers to the most common questions about diagnosis, escrow, payments, and dispute handling.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  question: "How quickly can I get a diagnosis?",
                  answer:
                    "Most cases get an initial AI-assisted diagnosis immediately after submission, so you can move to treatment fast.",
                },
                {
                  question: "What does escrow protect?",
                  answer:
                    "Escrow keeps farmer funds secured until the treatment is delivered and confirmed, protecting both buyers and service providers.",
                },
                {
                  question: "Can vendors bid on nearby cases?",
                  answer:
                    "Yes. Vendors can browse open cases in their region and submit proposals with clear pricing and terms.",
                },
                {
                  question: "Is my payment secure?",
                  answer:
                    "Payments are held in escrow and released only when the treatment is confirmed, giving both parties strong protection.",
                },
                {
                  question: "What happens if there is a dispute?",
                  answer:
                    "If there is a dispute, the Trustless Work process helps resolve it transparently and keeps funds secure until a resolution is reached.",
                },
                {
                  question: "Do I need a crypto wallet?",
                  answer:
                    "No, AgroShield handles payment flows and escrow on your behalf, so you can use the service without managing your own wallet.",
                },
              ].map((item, index) => (
                <div
                  key={item.question}
                  className="overflow-hidden rounded-3xl bg-neutral-100 p-5 transition-shadow duration-200 hover:shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="text-base font-semibold text-neutral-900">
                      {item.question}
                    </span>
                    <span className="ml-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-semibold text-neutral-900 shadow-sm">
                      {openIndex === index ? "−" : "+"}
                    </span>
                  </button>
                  <div
                    className={`mt-4 overflow-hidden transition-all duration-200 ${
                      openIndex === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <p className="text-sm leading-6 text-neutral-600">
                      {item.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}