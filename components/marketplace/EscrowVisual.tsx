"use client";

export default function EscrowVisual() {
  return (
    <div className="space-y-6 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Smart Contract</p>
          <h3 className="mt-1 font-[family-name:var(--font-manrope)] text-2xl font-extrabold text-neutral-900">
            Escrow Status
          </h3>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-neutral-100 bg-[#F5F0EB] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          <span className="h-2 w-2 rounded-full bg-[#16a34a] animate-pulse" /> Live
        </div>
      </div>

      <div className="relative pl-4 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-neutral-200">
        {[
          { label: "Escrow Created", state: "done", sub: "Contract deployed" },
          { label: "Funds Locked", state: "done", sub: "USDC secured" },
          { label: "Treatment Delivered", state: "active", sub: "Pending farmer confirmation" },
          { label: "Funds Released", state: "future", sub: "Awaiting delivery" },
        ].map((step) => {
          const isDone = step.state === "done";
          const isActive = step.state === "active";
          const tone = isDone ? "bg-[#16a34a] border-[#16a34a]" : isActive ? "bg-white border-amber-500 border-[3px]" : "bg-white border-neutral-300 border-[2px]";

          return (
            <div key={step.label} className="relative flex items-center gap-4">
              <span className={`absolute -left-[23px] h-3.5 w-3.5 rounded-full ${tone} ring-4 ring-white z-10`} />
              <div>
                <span className={`block text-sm font-semibold ${isDone || isActive ? "text-neutral-900" : "text-neutral-400"}`}>
                  {step.label}
                </span>
                <span className="block text-xs text-neutral-500 mt-0.5">{step.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Total Locked</div>
          <div className="mt-1 font-[family-name:var(--font-manrope)] text-2xl font-extrabold text-emerald-900">45.00 USDC</div>
        </div>
        <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm text-emerald-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={2.5}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs font-medium text-neutral-400">
        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-neutral-100 text-neutral-500">✦</span>
        Secured on Stellar Network
      </div>
    </div>
  );
}
