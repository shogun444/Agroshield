"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { signTransaction, connectWallet } from "@/lib/walletKit";
import { sendSignedTransaction, changeMilestoneStatus } from "@/lib/trustlesswork";
import { submitToHorizon } from "@/lib/stellar";

interface MarkTreatmentDoneButtonProps {
  caseId: string;
  contractId: string;
  assignedVendorId: string | null;
  currentStatus: string;
  onSuccess: (newStatus: string) => void;
}

function getAuthContext() {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("agroshield_token");
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      token,
      userId: typeof payload?.userId === "string" ? payload.userId : null,
      role: typeof payload?.role === "string" ? payload.role : null,
    };
  } catch {
    return null;
  }
}

export function MarkTreatmentDoneButton({
  caseId,
  contractId,
  assignedVendorId,
  currentStatus,
  onSuccess,
}: MarkTreatmentDoneButtonProps) {
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auth = getAuthContext();
  const canRender =
    currentStatus === "IN_PROGRESS" &&
    auth?.role === "VENDOR" &&
    auth.userId === assignedVendorId;

  if (!canRender || !auth?.userId || !auth.token) {
    return null;
  }

  async function handleClick() {
    setLoading(true);
    setError(null);
    const auth = getAuthContext();
    if (!auth?.userId || !auth.token) {
      setError("Authentication session lost. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      if (!contractId) {
        throw new Error("Escrow contractId missing.");
      }

      // 1. Change milestone status
      const twPayload = await changeMilestoneStatus({
        contractId,
        milestoneIndex: "0",
        newStatus: "completed",
        serviceProvider: auth.userId,
      });

      if (!twPayload || typeof twPayload !== "object" || !("unsignedTransaction" in twPayload)) {
        throw new Error("Failed to prepare milestone update.");
      }

      // 2. Connect wallet if needed
      let walletAddress = "";
      try {
        walletAddress = await connectWallet();
      } catch {
        throw new Error("Please connect your wallet to mark treatment as done.");
      }

      // 3. Sign transaction on TESTNET
      const signedXdr = await signTransaction({
        unsignedTransaction: String((twPayload as { unsignedTransaction?: string }).unsignedTransaction),
        address: walletAddress,
      });

      // 4. Send directly to Horizon
      await submitToHorizon(signedXdr);

      // 5. Update our backend
      const markRes = await fetch("/api/mark-treatment-done", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ caseId, contractId, milestoneIndex: 0 }),
      });

      const markPayload = await markRes.json();
      if (!markRes.ok || !markPayload.case) {
        throw new Error(markPayload.error ?? "Failed to mark treatment as delivered.");
      }

      onSuccess(markPayload.case.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <motion.button
        type="button"
        onClick={handleClick}
        disabled={loading}
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Marking delivered...
          </>
        ) : (
          "Mark Treatment Done"
        )}
      </motion.button>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
