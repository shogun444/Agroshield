"use client";

export default function FarmerCaseVisual() {
  return (
    <div className="space-y-5 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
      <div className="rounded-2xl bg-[#F5F0EB] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Detected Disease
            </p>
            <h3 className="mt-1 font-[family-name:var(--font-manrope)] text-2xl font-extrabold text-neutral-900">
              Tomato Late Blight
            </h3>
          </div>
          <span className="rounded-full border border-red-200 bg-red-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-red-700">
            High Risk
          </span>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs text-neutral-500">AI Confidence</span>
            <span className="text-xs font-bold text-neutral-800">94%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
            <div className="h-full w-[94%] rounded-full bg-[#16a34a]" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-100 bg-white p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Recommended Pesticide</p>
        <p className="mt-1 text-sm font-semibold text-neutral-900">Mancozeb 75 WP</p>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 shadow-md">
          Post to Marketplace <span className="opacity-70">→</span>
        </button>
        <p className="text-center text-xs font-medium text-neutral-500">
          3 vendors currently active in your area
        </p>
      </div>
    </div>
  );
}
