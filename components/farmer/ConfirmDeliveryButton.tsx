"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

interface ConfirmDeliveryButtonProps {
  caseId: string;
  contractId: string;
  currentStatus: string;
  onSuccess: (newStatus: string) => void;
}

const TW_BASE_URL =
  process.env.NEXT_PUBLIC_TRUSTLESS_WORK_API ?? "https://dev.api.trustlesswork.com";

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

function normalizeSignedXdr(result: unknown): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    const signed = (result as Record<string, unknown>).signedXdr ??
      (result as Record<string, unknown>).signedTransaction ??
      (result as Record<string, unknown>).signedTxXdr;
    if (typeof signed === "string") return signed;
  }
  throw new Error("Failed to sign transaction with Freighter.");
}

export function ConfirmDeliveryButton({
  caseId,
  contractId,
  currentStatus,
  onSuccess,
}: ConfirmDeliveryButtonProps) {
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auth = getAuthContext();
  const canRender = currentStatus === "DELIVERED" && auth?.role === "FARMER";

  if (!canRender || !auth?.userId || !auth.token) {
    return null;
  }

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      if (!auth?.token) throw new Error("Not authenticated");
      const { signTransaction } = await import("@stellar/freighter-api");

      const response = await fetch("/api/confirm-delivery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ caseId, contractId }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        approveXdr?: string;
        releaseXdr?: string;
        error?: string;
      };

      if (!response.ok || !payload.approveXdr || !payload.releaseXdr) {
        throw new Error(payload.error ?? "Failed to prepare delivery confirmation.");
      }

      const approveSigned = await signTransaction(payload.approveXdr);
      const approveXdr = normalizeSignedXdr(approveSigned);

      const approveSendRes = await fetch(`${TW_BASE_URL}/helper/send-transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedXdr: approveXdr }),
      });

      if (!approveSendRes.ok) {
        const approveSendPayload = (await approveSendRes.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        throw new Error(
          approveSendPayload.error ??
            approveSendPayload.message ??
            "Failed to broadcast milestone approval.",
        );
      }

      const releaseSigned = await signTransaction(payload.releaseXdr);
      const releaseXdr = normalizeSignedXdr(releaseSigned);

      const releaseSendRes = await fetch(`${TW_BASE_URL}/helper/send-transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedXdr: releaseXdr }),
      });

      if (!releaseSendRes.ok) {
        const releaseSendPayload = (await releaseSendRes.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        throw new Error(
          releaseSendPayload.error ??
            releaseSendPayload.message ??
            "Failed to broadcast fund release.",
        );
      }

      const confirmRes = await fetch("/api/confirm-delivery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ caseId, contractId, confirmed: true }),
      });

      const confirmPayload = (await confirmRes.json().catch(() => ({}))) as {
        error?: string;
        case?: { status: string };
      };

      if (!confirmRes.ok || !confirmPayload.case) {
        throw new Error(confirmPayload.error ?? "Failed to confirm delivery.");
      }

      onSuccess(confirmPayload.case.status);
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
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Confirming...
          </>
        ) : (
          "Confirm Delivery & Release Funds"
        )}
      </motion.button>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
