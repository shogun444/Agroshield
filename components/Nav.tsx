"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { memo, useEffect, useRef, useState } from "react";
import { notifyAuthChange, useAuthStatus, useHydrated } from "@/lib/auth-client";

const fallbackAvatar = (
  <svg viewBox="0 0 40 40" aria-hidden="true" className="h-9 w-9 text-neutral-400">
    <rect width="40" height="40" rx="20" fill="currentColor" opacity="0.2" />
    <circle cx="20" cy="15" r="6" fill="currentColor" opacity="0.55" />
    <path
      d="M8 33c2.5-6.5 8-9.5 12-9.5s9.5 3 12 9.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

function Nav() {
  const router = useRouter();
  const isAuthed = useAuthStatus();
  const hydrated = useHydrated();
  const pathname = usePathname();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const profileButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfileImage() {
      if (!hydrated || !isAuthed) {
        if (active) setProfileImage(null);
        return;
      }

      const token = localStorage.getItem("agroshield_token");
      if (!token) {
        if (active) setProfileImage(null);
        return;
      }

      try {
        const response = await fetch("/api/profile/summary", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await response.json().catch(() => ({}))) as {
          profile?: { user?: { profileImage?: string | null } };
        };

        if (active) {
          setProfileImage(
            response.ok ? data.profile?.user?.profileImage ?? null : null
          );
        }
      } catch {
        if (active) setProfileImage(null);
      }
    }

    void loadProfileImage();

    return () => {
      active = false;
    };
  }, [hydrated, isAuthed]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!isProfileMenuOpen) return;
      const menu = profileMenuRef.current;
      const button = profileButtonRef.current;
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

  const handleSignOut = async () => {
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
      localStorage.removeItem("agroshield_token");
      setIsProfileMenuOpen(false);
      notifyAuthChange();
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <nav className="fixed top-6 left-0 right-0 z-50">
      <div className="mx-auto w-full max-w-4xl px-6">
        <div className="flex items-center justify-between rounded-full bg-neutral-900/90 px-5 py-3 text-white shadow-sm backdrop-blur">
          <Link
            href="/"
            className="flex items-center gap-3 font-[family-name:var(--font-manrope)] text-sm"
          >
            <span className="h-3 w-3 rounded-sm bg-[#16a34a]" />
            <span className="font-semibold tracking-wide">AgroShield</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-neutral-300 md:flex">
            <Link className="transition hover:text-white" href="/#how">
              How it works
            </Link>
            <Link className="transition hover:text-white" href="/#farmers">
              For Farmers
            </Link>
            <Link className="transition hover:text-white" href="/#vendors">
              For Vendors
            </Link>
            <Link
              className={`transition hover:text-white ${pathname === "/marketplace" ? "text-white" : ""}`}
              href="/marketplace"
            >
              Marketplace
            </Link>
            <Link
              className={`transition hover:text-white ${pathname === "/diagnose" ? "text-white" : ""}`}
              href="/diagnose"
            >
              Diagnose
            </Link>
            {hydrated && isAuthed ? (
              <Link
                className={`transition hover:text-white ${pathname === "/profile" ? "text-white" : ""}`}
                href="/profile"
              >
                Profile
              </Link>
            ) : null}
            {hydrated && !isAuthed ? (
              <Link className="transition hover:text-white" href="/login">
                Log in
              </Link>
            ) : null}
          </div>
          {hydrated && !isAuthed ? (
            <Link className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-neutral-900" href="/signup">
              Get started
            </Link>
          ) : null}
          {hydrated && isAuthed ? (
            <div className="relative flex items-center gap-3 text-sm text-neutral-100">
              <button
                ref={profileButtonRef}
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/10 transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-label="Open profile menu"
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
                onClick={() => setIsProfileMenuOpen((current) => !current)}
              >
                {profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  fallbackAvatar
                )}
              </button>

              {isProfileMenuOpen ? (
                <div
                  ref={profileMenuRef}
                  role="menu"
                  aria-label="Profile menu"
                  className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-52 overflow-hidden rounded-3xl border border-white/10 bg-neutral-900 p-2 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.55)]"
                >
                  <Link
                    href="/profile#settings"
                    role="menuitem"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex w-full items-center rounded-2xl px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-white/10 hover:text-white"
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-medium text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

export default memo(Nav);
