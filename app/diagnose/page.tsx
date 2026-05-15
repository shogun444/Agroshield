"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { useAuthStatus, useHydrated } from "@/lib/auth-client";

type DiagnoseStep = "upload" | "result" | "post";

type DiagnosisResult = {
  disease?: string;
  confidence?: number;
  urgency?: string;
  recovery_days?: number;
  caused_by?: string;
  pesticide?: string;
  symptoms?: string;
  treatment?: string;
  preventive_measures?: string;
  [key: string]: unknown;
};

export default function DiagnosePage() {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const isAuthed = useAuthStatus();
  const hydrated = useHydrated();
  const [step, setStep] = useState<DiagnoseStep>("upload");
  const [userRole, setUserRole] = useState<"FARMER" | "VENDOR" | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [freeRemaining, setFreeRemaining] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [urgency, setUrgency] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;

    const token = localStorage.getItem("agroshield_token");
    if (!token) {
      setUserRole(null);
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.role === "FARMER" || data?.user?.role === "VENDOR") {
          setUserRole(data.user.role);
        } else {
          setUserRole(null);
        }
      })
      .catch(() => setUserRole(null));
  }, [hydrated]);

  const progressWidth = useMemo(() => {
    if (step === "upload") return "w-1/3";
    if (step === "result") return "w-2/3";
    return "w-full";
  }, [step]);

  const clearStep = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageDataUrl(null);
    setDiagnosis(null);
    setError(null);
    setPostError(null);
    setTitle("");
    setUrgency("MEDIUM");
    setLocation("");
    setDescription("");
    setSuccessMessage(null);
    setStep("upload");
  };

  const fileToDataUrl = (file: File) =>
    new Promise<{ url: string; base64: string; mimeType: string }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result?.toString() ?? "";
        const parts = result.split(",");
        if (parts.length < 2) {
          reject(new Error("Invalid image data"));
          return;
        }
        resolve({ url: result, base64: parts[1], mimeType: file.type || "image/jpeg" });
      };
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    setSelectedFile(file);
    setError(null);
    setDiagnosis(null);
    setStep("upload");

    const { url } = await fileToDataUrl(file);
    setPreviewUrl(url);
    setImageDataUrl(url);
  };

  const handleDrop = async (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0] ?? null;
    if (!file) return;
    await handleFileChange({ target: { files: [file] } } as any);
  };

  const handleRun = async () => {
    if (!selectedFile || !imageDataUrl) {
      setError("Please upload a crop photo first.");
      return;
    }

    if (!isAuthed && freeRemaining <= 0) {
      setError("Free credits are used. Please log in to continue.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { base64, mimeType } = await fileToDataUrl(selectedFile);
      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });

      const data = (await response.json()) as { diagnosis?: DiagnosisResult; error?: string };
      if (!response.ok || !data.diagnosis) {
        throw new Error(data.error ?? "Diagnosis failed. Please try again.");
      }

      const result = data.diagnosis;
      setDiagnosis(result);
      setStep("result");
      setTitle(`${result.disease ?? "Crop issue"}`);
      setUrgency(
        String(result.urgency ?? "MEDIUM").toUpperCase().startsWith("H")
          ? "HIGH"
          : String(result.urgency ?? "MEDIUM").toUpperCase().startsWith("L")
          ? "LOW"
          : "MEDIUM"
      );
      setLocation("");
      setDescription(String(result.treatment ?? result.symptoms ?? ""));
      if (!isAuthed) {
        setFreeRemaining((value) => Math.max(0, value - 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitCase = async () => {
    if (!imageDataUrl || !diagnosis) {
      setPostError("Missing diagnosis or uploaded photo.");
      return;
    }

    if (!userRole) {
      setPostError("Farmer access is required to post this case.");
      return;
    }

    setIsPosting(true);
    setPostError(null);

    try {
      const token = localStorage.getItem("agroshield_token");
      if (!token) throw new Error("Please log in to post the case.");

      const body = {
        imageUrl: imageDataUrl,
        diagnosis: {
          ...diagnosis,
          title,
          urgency,
          location,
          description,
        },
      };

      const response = await fetch("/api/cases/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to post case.");
      }

      setSuccessMessage("Case posted successfully.");
      router.push("/marketplace");
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Unable to post case.");
    } finally {
      setIsPosting(false);
    }
  };

  const stepLabel = step === "upload" ? "Step 1 of 3" : step === "result" ? "Step 2 of 3" : "Step 3 of 3";
  const stepTitle =
    step === "upload"
      ? "Diagnose your crop"
      : step === "result"
      ? "Diagnosis Complete"
      : "Post to Marketplace";
  const stepSubtitle =
    step === "upload"
      ? "Upload a clear photo of the affected leaves or plant area."
      : step === "result"
      ? `Detected: ${String(diagnosis?.disease ?? "Unknown issue")}`
      : "Vendors near you will see this and submit bids.";
  const confidencePercent = (() => {
    if (diagnosis?.confidence == null) return null;
    const numeric = Number(diagnosis.confidence);
    if (Number.isNaN(numeric)) return null;
    const percent = numeric <= 1 ? numeric * 100 : numeric;
    return Math.max(0, Math.min(100, Math.round(percent)));
  })();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Nav />
      <main className="pt-28 pb-24">
        <div className="mx-auto max-w-2xl px-6 py-16">
          <div className="mb-6 h-1 overflow-hidden rounded-full bg-neutral-200">
            <motion.div
              className={`h-full rounded-full bg-[#16a34a] ${progressWidth}`}
              transition={{ duration: 0.5 }}
            />
          </div>

          <div className="mb-6 space-y-3">
            <span className="inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500">
              {stepLabel}
            </span>
            <h1 className="font-[family-name:var(--font-manrope)] text-4xl font-extrabold text-neutral-900 tracking-tight">
              {stepTitle}
            </h1>
            <p className="max-w-xl text-base text-neutral-500">{stepSubtitle}</p>
          </div>

          <AnimatePresence mode="wait">
            {step === "upload" ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm"
              >
                <label
                  className="group block cursor-pointer rounded-3xl border-2 border-dashed border-neutral-300 bg-white p-12 text-center transition hover:border-[#16a34a] hover:bg-[#f0faf0]"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                >
                  <div className="text-4xl">🌿</div>
                  <p className="mt-4 text-sm font-medium text-neutral-900">Drop your photo here</p>
                  <p className="mt-2 text-xs text-neutral-400">or click to browse</p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                {previewUrl ? (
                  <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
                    <img src={previewUrl} alt="Selected crop" className="h-72 w-full object-cover" />
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleRun}
                  disabled={isLoading || !selectedFile}
                  className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Analyzing..." : "Run Diagnosis →"}
                </button>
              </motion.div>
            ) : step === "result" ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm"
              >
                {/* Header */}
                <div className="rounded-2xl bg-[#F5F0EB] p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                        Detected Disease
                      </p>
                      <h2 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-extrabold text-neutral-900 leading-tight">
                        {diagnosis?.disease ?? "Unknown issue"}
                      </h2>
                    </div>
                    <span
                      className={`mt-1 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide ${
                        String(diagnosis?.urgency ?? "").toUpperCase().startsWith("H")
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : String(diagnosis?.urgency ?? "").toUpperCase().startsWith("L")
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-amber-100 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {String(diagnosis?.urgency ?? "MEDIUM").toUpperCase()} Risk
                    </span>
                  </div>

                  {/* Confidence bar */}
                  {confidencePercent != null && (
                    <div className="mt-5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-neutral-500">AI Confidence</span>
                        <span className="text-xs font-bold text-neutral-800">{confidencePercent}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                        <div
                          className="h-full rounded-full bg-[#16a34a] transition-all duration-700"
                          style={{ width: `${confidencePercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick stats row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-neutral-100 bg-[#F5F0EB] p-4">
                    <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Caused by</p>
                    <p className="mt-1.5 text-sm font-semibold text-neutral-800 leading-snug">
                      {String(diagnosis?.caused_by ?? "—")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-neutral-100 bg-[#F5F0EB] p-4">
                    <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Recovery</p>
                    <p className="mt-1.5 text-sm font-semibold text-neutral-800">
                      {diagnosis?.recovery_days != null && Number(diagnosis.recovery_days) > 0
                        ? `~${diagnosis.recovery_days} days`
                        : "Ongoing management"}
                    </p>
                  </div>
                </div>

                {/* Pesticide */}
                <div className="rounded-2xl border border-neutral-100 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Recommended Pesticide</p>
                  <p className="mt-2 text-base font-semibold text-neutral-900">
                    {String(diagnosis?.pesticide ?? "Consult an agronomist")}
                  </p>
                </div>

                {/* Symptoms */}
                {diagnosis?.symptoms && (
                  <div className="rounded-2xl border border-neutral-100 bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">Symptoms</p>
                    <p className="text-sm text-neutral-600 leading-relaxed">{String(diagnosis.symptoms)}</p>
                  </div>
                )}

                {/* Treatment */}
                {diagnosis?.treatment && (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-2">Treatment Plan</p>
                    <p className="text-sm text-emerald-900 leading-relaxed">{String(diagnosis.treatment)}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    type="button"
                    onClick={userRole === "FARMER" ? () => setStep("post") : undefined}
                    disabled={userRole !== "FARMER"}
                    className={`rounded-full px-6 py-3 text-sm font-semibold transition ${
                      userRole === "FARMER"
                        ? "bg-neutral-900 text-white hover:bg-neutral-800"
                        : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                    }`}
                  >
                    {userRole === "FARMER" ? "Post to Marketplace →" : "Farmer access required"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { clearStep(); setStep("upload"); }}
                    className="rounded-full px-6 py-3 text-sm font-semibold text-neutral-500 transition hover:text-neutral-900"
                  >
                    Diagnose Another
                  </button>
                </div>
              </motion.div>

            ) : (
              <motion.div
                key="post"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm"
              >
                <div className="space-y-4">
                  <div className="rounded-3xl border border-neutral-100 bg-[#F5F0EB] p-6">
                    <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">Case details</p>
                    <h2 className="mt-2 font-[family-name:var(--font-manrope)] text-2xl font-bold text-neutral-900">
                      Post to Marketplace
                    </h2>
                    <p className="mt-2 text-sm text-neutral-500">
                      Vendors near you will see this and submit bids.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-medium text-neutral-700">Case title</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 outline-none transition focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/30"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700">Detected disease</label>
                      <input
                        type="text"
                        value={diagnosis?.disease ?? ""}
                        readOnly
                        className="mt-2 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 outline-none cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-neutral-700">Urgency</span>
                      <div className="mt-3 flex gap-2">
                        {(["LOW", "MEDIUM", "HIGH"] as const).map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setUrgency(level)}
                            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                              urgency === level
                                ? "bg-neutral-900 text-white"
                                : "border border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900"
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700">Your location (city / region)</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(event) => setLocation(event.target.value)}
                        placeholder="e.g. City, Region"
                        className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 outline-none transition focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/30"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700">Describe the problem (optional)</label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Add any extra details about symptoms, affected area size, etc."
                        className="mt-2 w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 outline-none transition focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/30"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700">Uploaded photo</label>
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Uploaded crop"
                          className="mt-3 h-32 w-full rounded-xl object-cover"
                        />
                      ) : (
                        <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-400">
                          No image uploaded
                        </div>
                      )}
                    </div>
                  </div>

                  {postError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {postError}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleSubmitCase}
                      disabled={isPosting}
                      className="flex-1 rounded-full bg-[#16a34a] px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isPosting ? "Posting..." : "Post Case →"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep("upload")}
                      className="flex-1 rounded-full border border-neutral-200 bg-white px-8 py-3.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100"
                    >
                      Back to Diagnose
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
}
