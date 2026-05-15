"use client";

import BidRow from "@/components/vendor/BidRow";

export default function VendorBidVisual() {
  return (
    <div className="space-y-6 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
      <div className="rounded-2xl bg-[#F5F0EB] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Target Case</p>
            <h3 className="mt-1 font-[family-name:var(--font-manrope)] text-lg font-bold text-neutral-900 leading-snug">
              Tomato Late Blight<br />
              <span className="text-neutral-500 font-medium text-sm">Kaduna, Nigeria</span>
            </h3>
          </div>
          <span className="rounded-full border border-red-200 bg-red-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-red-700">
            High Risk
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 px-1">Active Bids</p>
        <BidRow
          title="AgriVend Solutions"
          subtitle="2 day delivery"
          amount="$45 USDC"
          status="ACCEPTED"
        />
        <BidRow
          title="FarmCare Pro"
          subtitle="3 day delivery"
          amount="$38 USDC"
          status="PENDING"
        />
      </div>

      <button className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-neutral-800">
        Submit Proposal <span className="opacity-70">→</span>
      </button>
    </div>
  );
}
