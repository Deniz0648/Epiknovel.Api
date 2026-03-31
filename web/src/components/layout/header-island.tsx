"use client";

import { ChevronDown, LogOut, Menu, Shield, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/layout/logo-mark";
import { ThemeSelector } from "@/components/layout/theme-selector";
import { useAuth } from "@/components/providers/auth-provider";

export function HeaderIsland() {
  const pathname = usePathname();
  const isDiscoverActive = pathname === "/Books";
  const isUpdatesActive = pathname === "/Updates";
  const isAnnouncementsActive = pathname === "/announcements";
  const isCommunityActive = pathname === "/community" || pathname.startsWith("/community/");
  const isProfileActive = pathname === "/profile" || pathname === "/account/security";
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const { profile, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isMobileNavOpen && !isProfileMenuOpen) {
      return;
    }

    function closeOnOutsidePointer(event: MouseEvent | TouchEvent) {
      if (!headerRef.current) {
        return;
      }
      const target = event.target;
      if (target instanceof Node && !headerRef.current.contains(target)) {
        setIsMobileNavOpen(false);
        setIsProfileMenuOpen(false);
      }
    }

    function closeOnOutsideFocus(event: FocusEvent) {
      if (!headerRef.current) {
        return;
      }
      const target = event.target;
      if (target instanceof Node && !headerRef.current.contains(target)) {
        setIsMobileNavOpen(false);
        setIsProfileMenuOpen(false);
      }
    }

    function closeOnScroll() {
      setIsMobileNavOpen(false);
      setIsProfileMenuOpen(false);
    }

    window.addEventListener("mousedown", closeOnOutsidePointer);
    window.addEventListener("touchstart", closeOnOutsidePointer, { passive: true });
    window.addEventListener("focusin", closeOnOutsideFocus);
    window.addEventListener("scroll", closeOnScroll, { passive: true });
    window.addEventListener("wheel", closeOnScroll, { passive: true });

    return () => {
      window.removeEventListener("mousedown", closeOnOutsidePointer);
      window.removeEventListener("touchstart", closeOnOutsidePointer);
      window.removeEventListener("focusin", closeOnOutsideFocus);
      window.removeEventListener("scroll", closeOnScroll);
      window.removeEventListener("wheel", closeOnScroll);
    };
  }, [isMobileNavOpen, isProfileMenuOpen]);

  const discoverClass = `header-link rounded-full px-3.5 py-2 no-underline transition-all sm:px-4 ${
    isDiscoverActive
      ? "header-link-filled bg-primary text-primary-content shadow-lg shadow-primary/28"
      : "bg-transparent text-base-content/88"
  }`;
  const updatesClass = `header-link rounded-full px-3.5 py-2 no-underline transition-all sm:px-4 ${
    isUpdatesActive
      ? "header-link-filled bg-primary text-primary-content shadow-lg shadow-primary/28"
      : "bg-transparent text-base-content/88"
  }`;
  const announcementsClass = `header-link rounded-full px-3.5 py-2 no-underline transition-all sm:px-4 ${
    isAnnouncementsActive
      ? "header-link-filled bg-primary text-primary-content shadow-lg shadow-primary/28"
      : "bg-transparent text-base-content/88"
  }`;
  const communityClass = `header-link rounded-full px-3.5 py-2 no-underline transition-all sm:px-4 ${
    isCommunityActive
      ? "header-link-filled bg-primary text-primary-content shadow-lg shadow-primary/28"
      : "bg-transparent text-base-content/88"
  }`;

  function closeMobileNav() {
    setIsMobileNavOpen(false);
  }

  function closeProfileMenu() {
    setIsProfileMenuOpen(false);
  }

  return (
    <header
      ref={headerRef}
      className={`glass-island flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:rounded-full sm:px-5 ${
        isMobileNavOpen ? "rounded-t-3xl rounded-b-none sm:rounded-full" : "rounded-3xl"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <LogoMark />
        <nav className="hidden items-center gap-1.5 sm:flex">
          <Link href="/Books" className={discoverClass}>
            Kesfet
          </Link>
          <Link href="/Updates" className={updatesClass}>
            Guncellemeler
          </Link>
          <Link href="/announcements" className={announcementsClass}>
            Duyurular
          </Link>
          <Link href="/community" className={communityClass}>
            Topluluk
          </Link>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <ThemeSelector />
        {profile ? (
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((current) => !current)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                isProfileActive || isProfileMenuOpen
                  ? "border-primary/30 bg-primary/12 text-primary"
                  : "border-base-content/14 bg-base-100/26 text-base-content/80"
              }`}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-base-100/34 text-xs font-black">
                {profile.displayName.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-32 truncate">{profile.displayName}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isProfileMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {isProfileMenuOpen ? (
              <div className="glass-frame absolute right-0 top-[calc(100%+0.6rem)] z-30 w-56 overflow-hidden rounded-3xl border border-base-content/14 bg-base-100/90 p-2 backdrop-blur-2xl">
                <Link
                  href="/profile"
                  onClick={closeProfileMenu}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-base-content/82 no-underline transition hover:bg-base-100/38 hover:text-primary"
                >
                  <UserRound className="h-4 w-4" />
                  Profilim
                </Link>
                <Link
                  href="/profile#security"
                  onClick={closeProfileMenu}
                  className="mt-1 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-base-content/82 no-underline transition hover:bg-base-100/38 hover:text-primary"
                >
                  <Shield className="h-4 w-4" />
                  Guvenlik
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    void logout();
                    closeProfileMenu();
                  }}
                  className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-base-content/82 transition hover:bg-base-100/38 hover:text-error"
                >
                  <LogOut className="h-4 w-4" />
                  Cikis Yap
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <Link
            href="/login"
            className="header-link header-link-filled rounded-full bg-primary px-3.5 py-2 text-primary-content no-underline shadow-lg shadow-primary/28 transition-all hover:opacity-90 sm:px-4"
          >
            {isLoading ? "Yukleniyor" : "Giris Yap"}
          </Link>
        )}
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-base-content/18 bg-base-100/24 text-base-content/85 sm:hidden"
          aria-label={isMobileNavOpen ? "Menuyu kapat" : "Menuyu ac"}
          onClick={() => setIsMobileNavOpen((prev) => !prev)}
        >
          {isMobileNavOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
        </button>
      </div>

      {isMobileNavOpen ? (
        <nav className="-mt-px w-full rounded-b-3xl border-x border-b border-base-content/20 bg-base-100/92 px-2.5 pb-2.5 pt-2 shadow-lg backdrop-blur-xl sm:hidden">
          <Link
            href="/Books"
            onClick={closeMobileNav}
            className={`mb-1.5 block rounded-xl px-3 py-2 text-center text-sm font-semibold no-underline transition ${
              isDiscoverActive
                ? "bg-primary text-primary-content shadow-md shadow-primary/25"
                : "bg-base-200/70 text-base-content/86"
            }`}
          >
            Kesfet
          </Link>
          <Link
            href="/Updates"
            onClick={closeMobileNav}
            className={`block rounded-xl px-3 py-2 text-center text-sm font-semibold no-underline transition ${
              isUpdatesActive
                ? "bg-primary text-primary-content shadow-md shadow-primary/25"
                : "bg-base-200/70 text-base-content/86"
            }`}
          >
            Guncellemeler
          </Link>
          <Link
            href="/announcements"
            onClick={closeMobileNav}
            className={`mt-1.5 block rounded-xl px-3 py-2 text-center text-sm font-semibold no-underline transition ${
              isAnnouncementsActive
                ? "bg-primary text-primary-content shadow-md shadow-primary/25"
                : "bg-base-200/70 text-base-content/86"
            }`}
          >
            Duyurular
          </Link>
          <Link
            href="/community"
            onClick={closeMobileNav}
            className={`mt-1.5 block rounded-xl px-3 py-2 text-center text-sm font-semibold no-underline transition ${
              isCommunityActive
                ? "bg-primary text-primary-content shadow-md shadow-primary/25"
                : "bg-base-200/70 text-base-content/86"
            }`}
          >
            Topluluk
          </Link>
          {profile ? (
            <div className="mt-1.5 rounded-2xl border border-base-content/14 bg-base-200/45 p-2">
              <div className="flex items-center gap-2 rounded-xl px-3 py-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-base-100/40 text-xs font-black text-primary">
                  {profile.displayName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-base-content/86">{profile.displayName}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-base-content/50">Profil Menusu</p>
                </div>
              </div>
              <Link
                href="/profile"
                onClick={closeMobileNav}
                className={`mt-1 block rounded-xl px-3 py-2 text-center text-sm font-semibold no-underline transition ${
                  isProfileActive
                    ? "bg-primary text-primary-content shadow-md shadow-primary/25"
                    : "bg-base-100/55 text-base-content/86"
                }`}
              >
                Profilim
              </Link>
              <Link
                href="/profile#security"
                onClick={closeMobileNav}
                className="mt-1 block rounded-xl bg-base-100/55 px-3 py-2 text-center text-sm font-semibold text-base-content/86 no-underline transition"
              >
                Guvenlik
              </Link>
              <button
                type="button"
                onClick={() => {
                  void logout();
                  closeMobileNav();
                }}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-base-100/55 px-3 py-2 text-sm font-semibold text-base-content/86 transition hover:text-error"
              >
                <LogOut className="h-4 w-4" />
                Cikis Yap
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={closeMobileNav}
              className="mt-1.5 block rounded-xl bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-content no-underline shadow-md shadow-primary/25 transition"
            >
              {isLoading ? "Yukleniyor" : "Giris Yap"}
            </Link>
          )}
        </nav>
      ) : null}
    </header>
  );
}
