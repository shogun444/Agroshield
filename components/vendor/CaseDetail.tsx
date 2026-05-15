"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import type { BidOnCase, CaseDetailData } from "./types";
import { deriveBidStatus } from "./types";
import BidModal from "./BidModal";
import BidRow from "./BidRow";
import { signTransaction, isConnected } from "@stellar/freighter-api";
import { getConfiguredStellarNetworkLabel } from "@/lib/stellar-network";

interface CaseDetailProps {
  id: string;
  viewerRole?: "FARMER" | "VENDOR";
}

export default function CaseDetail({ id, viewerRole = "VENDOR" }: CaseDetailProps) {
  const reduceMotion = useReducedMotion();
  const networkLabel = getConfiguredStellarNetworkLabel();
  const networkCopy = networkLabel === "any Stellar network" ? "" : ` ${networkLabel}`;
  const [caseData, setCaseData] = useState<CaseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bidOpen, setBidOpen] = useState(false);
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);
  const [fundingEscrow, setFundingEscrow] = useState(false);
  const [escrowError, setEscrowError] = useState<string | null>(null);
  const [escrowNotice, setEscrowNotice] = useState<string | null>(null);
  const [userWalletAddress, setUserWalletAddress] = useState<string | null>(null);
  const [walletChecking, setWalletChecking] = useState(true);

  const fetchCase = useCallback(async () => {
    try {
      const res = await fetch(`/api/cases/${id}`);
      if (!res.ok) throw new Error("Failed to load case");
      const data = await res.json();
      setCaseData(data.case ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchCase();
  }, [fetchCase]);

  // Fetch user profile to check wallet status
  useEffect(() => {
    async function checkWallet() {
      try {
        const token = localStorage.getItem("agroshield_token");
        if (!token) {
          setWalletChecking(false);
          return;
        }
        const res = await fetch("/api/profile/summary", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUserWalletAddress(data?.profile?.user?.walletAddress ?? null);
        }
      } catch {
        // Ignore errors - wallet address just won't show
      } finally {
        setWalletChecking(false);
      }
    }
    checkWallet();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="mx-auto max-w-md py-32 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8">
          <p className="text-sm font-semibold text-red-700">Error</p>
          <p className="mt-1 text-xs text-red-500">{error ?? "Case not found"}</p>
          <button onClick={() => { setError(null); setLoading(true); fetchCase(); }}
            className="mt-4 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const disease = caseData.diagnosis?.disease ?? "Undiagnosed";
  const confidence = caseData.diagnosis?.confidence;
  const confidencePercent = (() => {
    if (confidence == null) return null;
    const numeric = Number(confidence);
    if (Number.isNaN(numeric)) return null;
    const percent = numeric <= 1 ? numeric * 100 : numeric;
    return Math.max(0, Math.min(100, Math.round(percent)));
  })();
  const description = caseData.diagnosis?.description ?? caseData.diagnosis?.treatment;
  const location = (caseData.diagnosis as { location?: string } | null)?.location ?? "Not shared";
  const cropType = (caseData.diagnosis as { crop?: string } | null)?.crop ?? "Not specified";
  const date = new Date(caseData.createdAt).toLocaleDateString("en-NG", {
    month: "long", day: "numeric", year: "numeric",
  });
  const expectedWalletAddress = userWalletAddress ?? caseData.farmer.walletAddress;

  const handleAcceptBid = async (bid: BidOnCase) => {
    setEscrowError(null);
    setEscrowNotice(null);
    setAcceptingBidId(bid.id);

    try {
      const token = localStorage.getItem("agroshield_token");
      if (!token) {
        throw new Error("Please log in again to continue.");
      }

      const freighterReady = await isConnected().catch(() => ({ isConnected: false }));
      if (!freighterReady.isConnected) {
        throw new Error("Connect Freighter before accepting this bid.");
      }

      const createRes = await fetch("/api/escrow/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ caseId: caseData.id, bidId: bid.id }),
      });

      const createData = (await createRes.json()) as {
        unsignedTransaction?: string;
        escrowId?: string;
        error?: string;
      };

      if (!createRes.ok || !createData.unsignedTransaction || !createData.escrowId) {
        throw new Error(createData.error ?? "Failed to create escrow.");
      }

      const signedXdr = await signTransaction(createData.unsignedTransaction);
      const signedTxXdr = (signedXdr as { signedTxXdr?: string }).signedTxXdr;
      const signerAddress = (signedXdr as { signerAddress?: string }).signerAddress ?? "";
      const signError = (signedXdr as { error?: { message?: string } }).error;

      if (signError || !signedTxXdr) {
        throw new Error(signError?.message ?? "Failed to sign the deploy transaction.");
      }

      if (expectedWalletAddress && signerAddress && signerAddress !== expectedWalletAddress) {
        throw new Error("Please sign with the farmer wallet connected to this case.");
      }

      const confirmRes = await fetch("/api/escrow/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          escrowId: createData.escrowId,
          bidId: bid.id,
          signedXdr: signedTxXdr,
        }),
      });

      const confirmData = (await confirmRes.json().catch(() => ({}))) as {
        contractId?: string;
        error?: string;
      };

      if (!confirmRes.ok) {
        throw new Error(confirmData.error ?? "Failed to confirm escrow deployment.");
      }

      setEscrowNotice("Escrow deployed. Fund it with USDC to start the contract.");
      await fetchCase();
    } catch (err) {
      setEscrowError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAcceptingBidId(null);
    }
  };

  const handleFundEscrow = async () => {
    if (!caseData.escrow) {
      return;
    }

    setEscrowError(null);
    setEscrowNotice(null);
    setFundingEscrow(true);

    try {
      const token = localStorage.getItem("agroshield_token");
      if (!token) {
        throw new Error("Please log in again to continue.");
      }

      const freighterReady = await isConnected().catch(() => ({ isConnected: false }));
      if (!freighterReady.isConnected) {
        throw new Error("Connect Freighter before funding the escrow.");
      }

      const fundRes = await fetch("/api/escrow/fund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ escrowId: caseData.escrow.id }),
      });

      const fundData = (await fundRes.json().catch(() => ({}))) as {
        unsignedTransaction?: string;
        error?: string;
      };

      if (!fundRes.ok || !fundData.unsignedTransaction) {
        throw new Error(fundData.error ?? "Failed to create funding transaction.");
      }

      const signedXdr = await signTransaction(fundData.unsignedTransaction);
      const signedTxXdr = (signedXdr as { signedTxXdr?: string }).signedTxXdr;
      const signerAddress = (signedXdr as { signerAddress?: string }).signerAddress ?? "";
      const signError = (signedXdr as { error?: { message?: string } }).error;

      if (signError || !signedTxXdr) {
        throw new Error(signError?.message ?? "Failed to sign the funding transaction.");
      }

      if (expectedWalletAddress && signerAddress && signerAddress !== expectedWalletAddress) {
        throw new Error("Please sign with the farmer wallet connected to this case.");
      }

      const confirmRes = await fetch("/api/escrow/fund/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          escrowId: caseData.escrow.id,
          signedXdr: signedTxXdr,
        }),
      });

      const confirmData = (await confirmRes.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!confirmRes.ok) {
        throw new Error(confirmData.error ?? "Failed to confirm escrow funding.");
      }

      setEscrowNotice("Escrow funded. The USDC is now locked in Trustless Work.");
      await fetchCase();
    } catch (err) {
      setEscrowError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setFundingEscrow(false);
    }
  };

  return (
    <div>
      {/* Warning banner if viewer wallet not connected */}
      {!walletChecking && !userWalletAddress ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-amber-600">⚠️</div>
            <div>
              <p className="text-sm font-semibold text-amber-800">Wallet not connected</p>
              <p className="mt-1 text-xs text-amber-700">
                {viewerRole === "VENDOR"
                  ? "Connect your Freighter wallet before accepting bids to enable escrow transactions."
                  : "Your wallet is not connected. Connect your Freighter wallet to receive escrow payouts."}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <motion.div
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]"
      >
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={caseData.imageUrl} alt={disease} className="h-full w-full object-cover" />
            <span
              className={`absolute left-4 top-4 rounded-full border px-3 py-1 text-xs font-medium ${
                caseData.status === "OPEN"
                  ? "bg-blue-50 text-blue-600 border-blue-100"
                  : "bg-yellow-50 text-yellow-700 border-yellow-100"
              }`}
            >
              {caseData.status === "OPEN" ? "Open" : caseData.status.replace("_", " ")}
            </span>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Case details
            </p>
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold text-neutral-900">
              {disease}
            </h1>

            {confidencePercent != null && (
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${confidencePercent}%` }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full bg-green-500"
                  />
                </div>
                <span className="whitespace-nowrap text-sm font-semibold text-neutral-700">
                  {confidencePercent}% confidence
                </span>
              </div>
            )}

            {description ? (
              <div className="mt-4 rounded-xl border border-green-100 bg-green-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-green-700">
                  Recommended treatment
                </p>
                <p className="mt-1 text-sm text-green-900">{description}</p>
              </div>
            ) : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <MetaCell label="Farmer" value={maskEmail(caseData.farmer.email)} />
              <MetaCell label="Submitted" value={date} />
              <MetaCell label="Location" value={location} />
              <MetaCell label="Crop Type" value={cropType} />
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-6">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  String(caseData.diagnosis?.urgency ?? "MEDIUM").toUpperCase().startsWith("H")
                    ? "bg-red-50 text-red-600 border-red-100"
                    : String(caseData.diagnosis?.urgency ?? "MEDIUM").toUpperCase().startsWith("L")
                      ? "bg-green-50 text-green-700 border-green-100"
                      : "bg-yellow-50 text-yellow-700 border-yellow-100"
                }`}
              >
                {String(caseData.diagnosis?.urgency ?? "MEDIUM").toUpperCase()}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  caseData.status === "OPEN"
                    ? "bg-blue-50 text-blue-600 border-blue-100"
                    : "bg-yellow-50 text-yellow-700 border-yellow-100"
                }`}
              >
                {caseData.status === "OPEN" ? "Open" : caseData.status.replace("_", " ")}
              </span>
            </div>

            <h2 className="mt-4 font-[family-name:var(--font-manrope)] text-lg font-bold text-neutral-900">
              Ready to treat this case?
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Submit your proposal with pricing and delivery time.
            </p>

            {caseData.status === "OPEN" && viewerRole === "VENDOR" ? (
              <button
                type="button"
                onClick={() => setBidOpen(true)}
                className="mt-5 w-full rounded-xl bg-neutral-900 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
              >
                Submit a Bid
              </button>
            ) : (
              <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-500">
                This case is not accepting new bids.
              </div>
            )}

            <div className="my-5 border-t border-neutral-100" />

            <div className="flex flex-col gap-3 text-xs text-neutral-400">
              <div className="flex items-center justify-between">
                <span>CURRENT BIDS</span>
                <span className="text-sm font-bold text-neutral-900">{caseData.bids.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>POSTED</span>
                <span className="text-sm font-bold text-neutral-900">{date}</span>
              </div>
            </div>

            {viewerRole === "FARMER" && caseData.escrow && caseData.escrow.contractId && caseData.escrow.status !== "FUNDED" ? (
              <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <p className="text-sm font-semibold text-sky-900">
                  Fund escrow with{networkCopy} USDC
                </p>
                <p className="mt-1 text-xs leading-5 text-sky-700">
                  The deploy step only creates the contract. You still need to fund it with USDC before work can begin.
                </p>
                <a
                  href="https://docs.trustlesswork.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-xs font-semibold text-sky-800 underline underline-offset-4"
                >
                  How to get{networkCopy} tokens
                </a>
                <button
                  type="button"
                  onClick={handleFundEscrow}
                  disabled={fundingEscrow}
                  className="mt-4 w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {fundingEscrow ? "Funding..." : "Fund Escrow"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-neutral-900">
            Bids on this case
          </h3>
          <span className="text-sm text-neutral-500">
            {caseData.bids.length} bid{caseData.bids.length !== 1 ? "s" : ""} submitted
          </span>
        </div>

        {caseData.bids.length > 0 ? (
          <div className="flex flex-col gap-3">
            {caseData.bids.map((bid, i) => {
              const status = deriveBidStatus(bid.selected, caseData.status);
              const amount = `$${Number(bid.amount).toFixed(2)}`;

              return (
                <div key={bid.id} className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
                  <BidRow
                    title={bid.vendor.email}
                    subtitle={bid.proposal}
                    amount={amount}
                    status={status}
                    index={i}
                    action={
                      viewerRole === "FARMER" && caseData.status === "OPEN" && !bid.selected ? (
                        <button
                          type="button"
                          onClick={() => handleAcceptBid(bid)}
                          disabled={acceptingBidId === bid.id}
                          className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {acceptingBidId === bid.id ? "Accepting..." : "Accept"}
                        </button>
                      ) : null
                    }
                  />
                </div>
              );
            })}
            {escrowError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
                {escrowError}
              </div>
            ) : null}
            {escrowNotice ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                {escrowNotice}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center">
            <div className="text-3xl">🤝</div>
            <p className="mt-3 text-sm font-semibold text-neutral-900">No bids yet</p>
            <p className="mt-1 text-xs text-neutral-500">Be the first to submit a proposal</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {bidOpen && viewerRole === "VENDOR" && (
          <BidModal caseId={id} onClose={() => setBidOpen(false)} onSuccess={() => { fetchCase(); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-neutral-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-800">{value}</p>
    </div>
  );
}

function maskEmail(value: string) {
  const [name, domain] = value.split("@");
  if (!name || !domain) return value;
  if (name.length <= 2) return `••@${domain}`;
  return `${name.slice(0, 2)}•••@${domain}`;
}
