"use client";

import { useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";

interface RaiseDisputeButtonProps {
  caseId: string;
  escrowContractId: string;
  farmerWalletAddress: string;
  onDisputeRaised?: () => void;
}

export default function RaiseDisputeButton({
  caseId,
  onDisputeRaised,
}: RaiseDisputeButtonProps) {
  const reduceMotion = useReducedMotion();
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleRaiseDispute = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason for the dispute.");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const token = localStorage.getItem("agroshield_token");
      if (!token) throw new Error("Please log in again.");

      const res = await fetch("/api/disputes/raise", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ caseId, reason }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to raise dispute");

      setStatus("success");
      onDisputeRaised?.();
      setTimeout(() => {
        setShowModal(false);
        setStatus("idle");
        setReason("");
      }, 3000);
    } catch (err) {
      console.error("[RAISE_DISPUTE_UI]", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setStatus("error");
    }
  };


  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
      >
        Raise Dispute
      </button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
            onClick={(e) => {
              if (
                e.target === e.currentTarget &&
                status !== "loading" &&
                status !== "signing" &&
                status !== "sending"
              ) {
                setShowModal(false);
                setStatus("idle");
                setError(null);
              }
            }}
          >
            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-2xl"
            >
              <div className="absolute right-0 top-0 h-40 w-40 -translate-y-8 translate-x-8 rounded-full bg-red-100 opacity-50 blur-2xl" />

              <div className="relative px-8 py-8">
                <AnimatePresence mode="wait">
                  {status === "success" ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center gap-3 py-6 text-center"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-2xl">
                        ✓
                      </div>
                      <p className="text-lg font-bold text-neutral-900 font-[family-name:var(--font-manrope)]">
                        Dispute raised
                      </p>
                      <p className="text-sm text-neutral-500 font-[family-name:var(--font-inter)]">
                        We&apos;ll review within 48 hours.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div key="form">
                      <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-neutral-900">
                        Raise a Dispute
                      </h3>
                      <p className="mt-1 text-sm text-neutral-500 font-[family-name:var(--font-inter)]">
                        Describe what went wrong. Our team will review and resolve within 48 hours.
                      </p>

                      <div className="mt-6 space-y-4">
                        <div>
                          <label className="text-sm font-medium text-neutral-700">
                            Reason for Dispute
                          </label>
                          <textarea
                            rows={4}
                            placeholder="e.g. Vendor did not deliver the treatment within the agreed timeframe..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={status !== "idle" && status !== "error"}
                            className="mt-2 w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-red-100 disabled:opacity-50"
                          />
                        </div>

                        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-sm text-yellow-800 font-[family-name:var(--font-inter)]">
                        {"⚠ Raising a dispute will freeze the escrow. Funds will not move until"}
                        {" "}
                        our team resolves it.
                        </div>

                        {error && (
                          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
                            {error}
                          </div>
                        )}

                        <div className="flex gap-3 pt-1">
                          <button
                            type="button"
                            disabled={status !== "idle" && status !== "error"}
                            onClick={() => {
                              setShowModal(false);
                              setStatus("idle");
                              setError(null);
                            }}
                            className="flex-1 rounded-2xl border border-neutral-200 bg-[#F5F0EB] px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleRaiseDispute}
                            disabled={status !== "idle" && status !== "error"}
                            className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {status === "loading" ? "Submitting..." : "Raise Dispute →"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
