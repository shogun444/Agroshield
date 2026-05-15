"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { notifyAuthChange } from "@/lib/auth-client";
import {
  connectFreighterWallet,
  getExpectedWalletNetworkLabel,
} from "@/lib/freighter-wallet";

type ProfileItem = {
  id: string;
  title: string;
  summary: string;
  status: string;
  createdAt: string;
  meta: string[];
};

type ProfileActivity = {
  id: string;
  title: string;
  note: string;
  time: string;
  tone: "positive" | "neutral" | "warning";
};

type ProfileStat = {
  label: string;
  value: string;
  helper: string;
};

type ProfileSetting = {
  label: string;
  value: string;
  helper: string;
};

type ProfileSummary = {
  user: {
    id: string;
    email: string;
    username: string | null;
    role: string;
    walletAddress: string | null;
    profileImage: string | null;
    createdAt: string;
  };
  headline: string;
  subheadline: string;
  stats: ProfileStat[];
  items: ProfileItem[];
  activity: ProfileActivity[];
  settings: ProfileSetting[];
};

type ProfileState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "error"; message: string }
  | { status: "ready"; profile: ProfileSummary };

type EditProfileForm = {
  email: string;
  username: string;
  walletAddress: string;
  profileImage: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatEmailForDisplay(email: string) {
  const [localPart, domainPart] = email.split("@");
  if (!localPart || !domainPart) return email;

  const prefix = localPart.slice(0, 4);
  const suffix = domainPart.split(".").pop() ?? domainPart.slice(-3);
  return `${prefix}...${suffix}`;
}

function formatUsernameDisplay(username: string | null, email: string) {
  if (!username) {
    const localPart = email.split("@")[0] ?? "user";
    return `@${localPart}`;
  }
  return username.startsWith("@") ? username : `@${username}`;
}

function truncateAddress(address: string | null) {
  if (!address) return "Not connected";
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function updateProfileWallet(
  current: ProfileState,
  walletAddress: string | null,
): ProfileState {
  if (current.status !== "ready") {
    return current;
  }

  return {
    status: "ready",
    profile: {
      ...current.profile,
      user: {
        ...current.profile.user,
        walletAddress,
      },
    },
  };
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString() ?? "";
      if (!result.startsWith("data:image/")) {
        reject(new Error("Please choose a valid image file."));
        return;
      }
      resolve(result);
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Wallet connection timed out. Please try again."));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function LoadingShell() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="overflow-hidden rounded-[32px] border border-neutral-200 bg-white shadow-[0_30px_80px_-60px_rgba(0,0,0,0.5)]"
    >
      <div className="animate-pulse space-y-8 p-6 sm:p-8 lg:p-10">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="h-6 w-28 rounded-full bg-neutral-100" />
            <div className="h-12 w-full rounded-2xl bg-neutral-100" />
            <div className="h-5 w-4/5 rounded-full bg-neutral-100" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 rounded-2xl bg-neutral-100" />
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-neutral-100" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="h-80 rounded-3xl bg-neutral-100" />
          <div className="h-80 rounded-3xl bg-neutral-100" />
        </div>
      </div>
    </motion.div>
  );
}

export default function ProfileDashboard() {
  const router = useRouter();
  const [state, setState] = useState<ProfileState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditProfileForm>({
    email: "",
    username: "",
    walletAddress: "",
    profileImage: "",
  });
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null,
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const token = localStorage.getItem("agroshield_token");
      if (!token) {
        if (active) setState({ status: "unauthenticated" });
        return;
      }

      if (active) setState({ status: "loading" });

      try {
        const response = await fetch("/api/profile/summary", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = (await response.json()) as
          | { profile: ProfileSummary; error?: string }
          | { error?: string };

        if (!response.ok || !("profile" in payload)) {
          if (response.status === 401) {
            if (active) setState({ status: "unauthenticated" });
            return;
          }

          throw new Error(payload.error ?? "Unable to load profile.");
        }

        if (active) {
          setState({ status: "ready", profile: payload.profile });
        }
      } catch (error) {
        if (active) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Unable to load profile.",
          });
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [retryKey]);

  const handleLogout = async () => {
    const token = localStorage.getItem("agroshield_token");

    try {
      if (token) {
        await fetch("/api/profile/wallet", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ walletAddress: null }),
        });
      }
    } catch {
      // Best effort only. Logout must still complete.
    } finally {
      setIsProfileMenuOpen(false);
      localStorage.removeItem("agroshield_token");
      notifyAuthChange();
      router.replace("/login");
      router.refresh();
    }
  };

  const handleOpenSettings = () => {
    setIsProfileMenuOpen(false);
    const settingsSection = document.getElementById("settings");
    settingsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    settingsSection?.focus();
  };

  const handleEditProfile = () => {
    if (state.status !== "ready") return;

    setEditError(null);
    setEditForm({
      email: state.profile.user.email,
      username: state.profile.user.username ?? "",
      walletAddress: state.profile.user.walletAddress ?? "",
      profileImage: state.profile.user.profileImage ?? "",
    });
    setProfileImagePreview(state.profile.user.profileImage ?? null);
    setIsEditOpen(true);
  };

  const handleCloseEditor = () => {
    if (isSavingProfile) return;
    setIsEditOpen(false);
    setEditError(null);
  };

  const handleProfileImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      setEditForm((current) => ({ ...current, profileImage: dataUrl }));
      setProfileImagePreview(dataUrl);
      setEditError(null);
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Unable to load image.",
      );
    }
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const token = localStorage.getItem("agroshield_token");
    if (!token) {
      setEditError("Please log in again.");
      return;
    }

    setIsSavingProfile(true);
    setEditError(null);

    try {
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: editForm.email,
          username: editForm.username,
          walletAddress: editForm.walletAddress.trim() || null,
          profileImage: editForm.profileImage.trim() || null,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        success?: boolean;
      };
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Unable to save profile.");
      }

      setIsEditOpen(false);
      setRetryKey((value) => value + 1);
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Unable to save profile.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCopyWallet = async (walletAddress: string | null) => {
    if (!walletAddress || !navigator.clipboard) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopiedAddress(walletAddress);
    window.setTimeout(() => {
      setCopiedAddress(null);
    }, 2000);
  };

  const handleConnectWallet = useCallback(async () => {
    setConnectingWallet(true);
    setWalletError(null);

    const token = localStorage.getItem("agroshield_token");
    if (!token) {
      setWalletError("Please log in to connect your wallet.");
      setConnectingWallet(false);
      return;
    }

    try {
      const access = await withTimeout(connectFreighterWallet(), 45000);

      const response = await fetch("/api/profile/wallet", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ walletAddress: access.address }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        walletAddress?: string;
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to save wallet address.");
      }

      const savedWalletAddress = data.walletAddress ?? access.address;
      setState((current) => updateProfileWallet(current, savedWalletAddress));
      setEditForm((current) => ({
        ...current,
        walletAddress: savedWalletAddress,
      }));
    } catch (err) {
      setWalletError(
        err instanceof Error ? err.message : "Failed to connect wallet.",
      );
    } finally {
      setConnectingWallet(false);
    }
  }, []);

  const handleDisconnectWallet = useCallback(async () => {
    const token = localStorage.getItem("agroshield_token");
    if (!token) return;

    setWalletError(null);

    try {
      const response = await fetch("/api/profile/wallet", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ walletAddress: null }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to disconnect wallet.");
      }

      setState((current) => {
        if (current.status !== "ready") return current;
        return {
          ...current,
          profile: {
            ...current.profile,
            user: {
              ...current.profile.user,
              walletAddress: null,
            },
            settings: current.profile.settings.map((setting) =>
              setting.label === "Wallet status"
                ? {
                    ...setting,
                    value: "Not connected",
                    helper: "Add a wallet to settle payouts faster",
                  }
                : setting,
            ),
          },
        };
      });

      if (isEditOpen) {
        setEditForm((current) => ({ ...current, walletAddress: "" }));
      }

      setRetryKey((value) => value + 1);
    } catch (error) {
      setWalletError(
        error instanceof Error ? error.message : "Failed to disconnect wallet.",
      );
    }
  }, [isEditOpen]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!isProfileMenuOpen) return;
      const menu = profileMenuRef.current;
      const button = profileMenuButtonRef.current;
      const target = event.target as Node;

      if (menu?.contains(target) || button?.contains(target)) {
        return;
      }

      setIsProfileMenuOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isProfileMenuOpen]);

  if (state.status === "loading") {
    return (
      <main className="pt-28 pb-24">
        <div className="mx-auto max-w-6xl px-6">
          <LoadingShell />
        </div>
      </main>
    );
  }

  if (state.status === "unauthenticated") {
    return (
      <main className="pt-28 pb-24">
        <div className="mx-auto max-w-4xl px-6">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[32px] border border-neutral-200 bg-white p-8 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.5)] md:p-10"
          >
            <div className="inline-flex rounded-full border border-neutral-200 bg-[#f9f4ee] px-3 py-1 text-xs text-[#16a34a]">
              Profile required
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-manrope)] text-4xl font-bold text-neutral-900">
              Log in to view your profile
            </h1>
            <p className="mt-3 max-w-2xl text-base text-neutral-500">
              Your activity overview, listings, and account settings are
              available after you sign in.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-700"
              >
                Create account
              </Link>
            </div>
          </motion.section>
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="pt-28 pb-24">
        <div className="mx-auto max-w-4xl px-6">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[32px] border border-red-200 bg-white p-8 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.5)] md:p-10"
          >
            <div className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-600">
              Profile error
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-manrope)] text-4xl font-bold text-neutral-900">
              Could not load your profile
            </h1>
            <p className="mt-3 max-w-2xl text-base text-neutral-500">
              {state.message}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setRetryKey((value) => value + 1)}
                className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white"
              >
                Try again
              </button>
              <Link
                href="/login"
                className="rounded-full border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-700"
              >
                Re-authenticate
              </Link>
            </div>
          </motion.section>
        </div>
      </main>
    );
  }

  const { profile } = state;
  const roleLabel = profile.user.role === "FARMER" ? "Farmer" : "Vendor";
  const roleTone =
    profile.user.role === "FARMER"
      ? "bg-[#16a34a]/10 text-[#16a34a]"
      : "bg-[#d5ebff] text-[#0f6b2f]";

  // Avatar logic: profileImage > username > email
  const avatarLetter = profile.user.profileImage
    ? null
    : (
        profile.user.username?.[0] ??
        profile.user.email[0] ??
        "?"
      ).toUpperCase();
  const displayEmail = formatEmailForDisplay(profile.user.email);
  const displayUsername = formatUsernameDisplay(
    profile.user.username,
    profile.user.email,
  );

  return (
    <main className="pt-28 pb-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-[32px] border border-neutral-200 bg-white shadow-[0_30px_80px_-60px_rgba(0,0,0,0.5)]"
        >
          <div className="relative px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="absolute right-0 top-0 h-52 w-52 translate-x-16 -translate-y-16 rounded-full bg-[#d5ebff] opacity-50 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-52 w-52 -translate-x-16 translate-y-16 rounded-full bg-[#c7f1d2] opacity-50 blur-3xl" />

            <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div className="flex flex-wrap items-start gap-5">
                <div className="relative">
                  <button
                    ref={profileMenuButtonRef}
                    type="button"
                    onClick={() => setIsProfileMenuOpen((current) => !current)}
                    aria-haspopup="menu"
                    aria-expanded={isProfileMenuOpen}
                    aria-label="Open profile menu"
                    className="group flex h-20 w-20 items-center justify-center overflow-hidden rounded-full ring-1 ring-transparent transition hover:ring-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    {profile.user.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.user.profileImage}
                        alt="Profile"
                        className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-neutral-900 text-xl font-semibold text-white transition duration-200 group-hover:scale-105">
                        {avatarLetter}
                      </div>
                    )}
                  </button>

                  <AnimatePresence>
                    {isProfileMenuOpen ? (
                      <motion.div
                        ref={profileMenuRef}
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.16 }}
                        className="absolute left-0 top-[calc(100%+0.75rem)] z-20 w-56 overflow-hidden rounded-3xl border border-neutral-200 bg-white p-2 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.35)]"
                        role="menu"
                        aria-label="Profile menu"
                      >
                        <button
                          type="button"
                          onClick={handleOpenSettings}
                          className="flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-900"
                          role="menuitem"
                        >
                          Settings
                        </button>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                          role="menuitem"
                        >
                          Sign out
                        </button>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
                <div className="min-w-0 max-w-2xl">
                  <div
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${roleTone}`}
                  >
                    {roleLabel}
                  </div>
                  <h1
                    className="mt-4 font-[family-name:var(--font-manrope)] text-4xl font-bold text-neutral-900 md:text-5xl"
                    title={profile.user.username ?? profile.user.email}
                  >
                    {displayUsername}
                  </h1>
                  <p className="mt-3 text-sm font-medium text-neutral-700">
                    {profile.user.email}
                  </p>
                  <p className="mt-4 text-base text-neutral-500 md:text-lg">
                    {profile.headline}
                  </p>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
                    {profile.subheadline}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleEditProfile}
                      className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white"
                    >
                      Edit profile
                    </button>
                    <Link
                      href="/marketplace"
                      className="rounded-full border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-700"
                    >
                      Open marketplace
                    </Link>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                    Member since
                  </div>
                  <div className="mt-2 font-[family-name:var(--font-manrope)] text-xl font-semibold text-neutral-900">
                    {formatDate(profile.user.createdAt)}
                  </div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                    Wallet
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="break-all font-[family-name:var(--font-manrope)] text-xl font-semibold text-neutral-900">
                      {profile.user.walletAddress
                        ? truncateAddress(profile.user.walletAddress)
                        : "Not connected"}
                    </span>
                    {profile.user.walletAddress ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyWallet(profile.user.walletAddress)
                        }
                        className="relative rounded-full p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
                        title="Copy wallet address"
                      >
                        <AnimatePresence mode="wait">
                          {copiedAddress === profile.user.walletAddress ? (
                            <motion.svg
                              key="check"
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-[#16a34a]"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0, rotate: 180 }}
                              transition={{ duration: 0.2 }}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </motion.svg>
                          ) : (
                            <motion.svg
                              key="copy"
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              initial={{ scale: 0, rotate: 180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0, rotate: -180 }}
                              transition={{ duration: 0.2 }}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012 2h8a2 2 0 012-2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </motion.svg>
                          )}
                        </AnimatePresence>
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:col-span-2">
                  <div className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                    Username
                  </div>
                  <div
                    className="mt-2 font-[family-name:var(--font-manrope)] text-lg font-semibold text-neutral-900"
                    title={profile.user.username ?? profile.user.email}
                  >
                    {displayUsername}
                  </div>
                  <div className="mt-2 text-xs text-neutral-500">
                    {displayEmail}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {profile.stats.map((stat) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="rounded-2xl border border-neutral-100 bg-[#f9f4ee] p-5"
                >
                  <div className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                    {stat.label}
                  </div>
                  <div className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-bold text-neutral-900">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-sm text-neutral-500">
                    {stat.helper}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="grid gap-0 border-t border-neutral-100 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-6 px-6 py-8 sm:px-8 lg:px-10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                    Your items
                  </div>
                  <h2 className="mt-2 font-[family-name:var(--font-manrope)] text-2xl font-semibold text-neutral-900">
                    {profile.user.role === "FARMER"
                      ? "Cases and listings"
                      : "Bids and offers"}
                  </h2>
                </div>
                <div className="rounded-full border border-neutral-200 bg-[#f9f4ee] px-3 py-1 text-xs text-neutral-500">
                  {profile.items.length} item
                  {profile.items.length === 1 ? "" : "s"}
                </div>
              </div>

              {profile.items.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {profile.items.map((item, index) => {
                    const badgeTone =
                      item.status === "OPEN"
                        ? "bg-[#16a34a]/10 text-[#16a34a]"
                        : item.status === "IN_PROGRESS" ||
                            item.status === "SELECTED"
                          ? "bg-[#d5ebff] text-[#0f6b2f]"
                          : "bg-[#f1dcc7] text-[#8c5b1f]";

                    return (
                      <motion.article
                        key={item.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: index * 0.05 }}
                        className="rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm"
                      >
                        <div
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone}`}
                        >
                          {item.status.replaceAll("_", " ")}
                        </div>
                        <h3 className="mt-4 font-[family-name:var(--font-manrope)] text-lg font-semibold text-neutral-900">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-neutral-500">
                          {item.summary}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.meta.map((meta) => (
                            <span
                              key={meta}
                              className="rounded-full bg-[#f9f4ee] px-3 py-1 text-xs text-neutral-500"
                            >
                              {meta}
                            </span>
                          ))}
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-neutral-200 bg-[#f9f4ee] p-8 text-sm text-neutral-500">
                  No activity yet. Your cases and bids will appear here once you
                  start using the marketplace.
                </div>
              )}
            </section>

            <aside className="space-y-6 border-t border-neutral-100 bg-[#f9f4ee] px-6 py-8 sm:px-8 lg:border-t-0 lg:border-l lg:px-10">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                  Activity
                </div>
                <h2 className="mt-2 font-[family-name:var(--font-manrope)] text-2xl font-semibold text-neutral-900">
                  Recent updates
                </h2>
              </div>

              <div className="space-y-4">
                {profile.activity.length > 0 ? (
                  profile.activity.map((activity) => {
                    const tone =
                      activity.tone === "positive"
                        ? "bg-[#16a34a]"
                        : activity.tone === "warning"
                          ? "bg-[#c77d15]"
                          : "bg-neutral-400";

                    return (
                      <div
                        key={activity.id}
                        className="rounded-3xl border border-neutral-100 bg-white p-5"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-1 h-2.5 w-2.5 rounded-full ${tone}`}
                          />
                          <div className="flex-1">
                            <div className="font-[family-name:var(--font-manrope)] text-lg font-semibold text-neutral-900">
                              {activity.title}
                            </div>
                            <p className="mt-2 text-sm leading-6 text-neutral-500">
                              {activity.note}
                            </p>
                            <div className="mt-3 text-xs uppercase tracking-[0.2em] text-neutral-400">
                              {activity.time}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-3xl border border-dashed border-neutral-200 bg-white p-5 text-sm text-neutral-500">
                    No recent activity yet.
                  </div>
                )}
              </div>

              <section
                id="settings"
                tabIndex={-1}
                className="space-y-4 rounded-3xl border border-neutral-100 bg-white p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                      Settings
                    </div>
                    <h3 className="mt-2 font-[family-name:var(--font-manrope)] text-xl font-semibold text-neutral-900">
                      Account controls
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRetryKey((value) => value + 1)}
                    className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600"
                  >
                    Refresh
                  </button>
                </div>

                <div className="space-y-3">
                  {profile.settings.map((setting) => {
                    const helperText =
                      setting.label === "Wallet status" &&
                      profile.user.walletAddress
                        ? truncateAddress(profile.user.walletAddress)
                        : setting.helper;

                    return (
                      <div
                        key={setting.label}
                        className="rounded-2xl border border-neutral-100 bg-[#f9f4ee] p-4"
                      >
                        <div className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                          {setting.label}
                        </div>
                        <div className="mt-1 font-[family-name:var(--font-manrope)] text-lg font-semibold text-neutral-900">
                          {setting.value}
                        </div>
                        <div className="mt-2 text-sm text-neutral-500">
                          {helperText}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  {profile.user.walletAddress ? (
                    <button
                      type="button"
                      onClick={handleDisconnectWallet}
                      className="rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                    >
                      Disconnect Wallet
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectWallet}
                      disabled={connectingWallet}
                      className="rounded-full bg-[#16a34a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {connectingWallet ? "Connecting..." : "Connect Wallet"}
                    </button>
                  )}
                  <Link
                    href="/diagnose"
                    className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700"
                  >
                    Open diagnosis
                  </Link>
                </div>
                {walletError ? (
                  <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {walletError}
                  </div>
                ) : null}
                <p className="text-xs text-neutral-400">
                  Freighter will ask you to confirm the active wallet on every
                  connect.
                  {getExpectedWalletNetworkLabel() !== "any Stellar network"
                    ? ` Expected network: ${getExpectedWalletNetworkLabel()}.`
                    : ""}
                </p>
              </section>
            </aside>
          </div>
        </motion.section>
      </div>

      {isEditOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6"
          onClick={handleCloseEditor}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-editor-title"
            className="w-full max-w-xl overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-[0_30px_80px_-40px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-neutral-100 px-6 py-5 sm:px-8">
              <div className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                Edit profile
              </div>
              <h2
                id="profile-editor-title"
                className="mt-2 font-[family-name:var(--font-manrope)] text-2xl font-semibold text-neutral-900"
              >
                Update your account details
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Change your email or wallet address and save the update to the
                database.
              </p>
            </div>

            <form
              className="space-y-5 px-6 py-6 sm:px-8"
              onSubmit={handleSaveProfile}
            >
              <div>
                <label
                  className="text-sm font-medium text-neutral-700"
                  htmlFor="profile-email"
                >
                  Email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={editForm.email}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-[#c7f1d2]"
                />
              </div>

              <div>
                <label
                  className="text-sm font-medium text-neutral-700"
                  htmlFor="profile-username"
                >
                  Username
                </label>
                <input
                  id="profile-username"
                  type="text"
                  value={editForm.username}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                  placeholder="lowercase letters, numbers, underscores"
                  className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-[#c7f1d2]"
                />
              </div>

              <div>
                <label
                  className="text-sm font-medium text-neutral-700"
                  htmlFor="profile-wallet"
                >
                  Wallet address
                </label>
                <input
                  id="profile-wallet"
                  type="text"
                  value={editForm.walletAddress}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      walletAddress: event.target.value,
                    }))
                  }
                  placeholder="Optional"
                  className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-[#c7f1d2]"
                />
              </div>

              <div>
                <label
                  className="text-sm font-medium text-neutral-700"
                  htmlFor="profile-image"
                >
                  Profile image
                </label>
                <div className="mt-2 flex items-center gap-4">
                  {profileImagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profileImagePreview}
                      alt="Profile preview"
                      className="h-16 w-16 rounded-2xl object-cover ring-1 ring-neutral-200"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 text-xs font-semibold text-neutral-400">
                      Preview
                    </div>
                  )}
                  <input
                    id="profile-image"
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    className="block w-full cursor-pointer rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 outline-none transition file:mr-4 file:rounded-xl file:border-0 file:bg-neutral-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-neutral-800 focus:border-neutral-400 focus:ring-2 focus:ring-[#c7f1d2]"
                  />
                </div>
                <p className="mt-2 text-xs text-neutral-400">
                  Upload an image from your device. It will be stored as a data
                  URL, like the crop photo upload.
                </p>
                {profileImagePreview ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditForm((current) => ({
                        ...current,
                        profileImage: "",
                      }));
                      setProfileImagePreview(null);
                    }}
                    className="mt-2 text-xs font-medium text-neutral-500 underline underline-offset-4"
                  >
                    Remove image
                  </button>
                ) : null}
              </div>

              {editError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {editError}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseEditor}
                  className="rounded-full border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSavingProfile ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
