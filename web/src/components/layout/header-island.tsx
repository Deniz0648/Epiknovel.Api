"use client";

import { Bell, LogIn, LogOut, Menu, Shield, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/layout/logo-mark";
import { ThemeSelector } from "@/components/layout/theme-selector";
import { useAuth } from "@/components/providers/auth-provider";
import { useNotifications } from "@/components/providers/notifications-provider";
import { canAccessAuthorPanel } from "@/lib/auth";
import { dispatchHeaderOverlayOpen, getHeaderOverlayEventName, type HeaderOverlayName } from "@/lib/header-overlays";

export function HeaderIsland() {
  const pathname = usePathname();
  const isDiscoverActive = pathname === "/Books";
  const isUpdatesActive = pathname === "/Updates";
  const isAnnouncementsActive = pathname === "/announcements";
  const isCommunityActive = pathname === "/community" || pathname.startsWith("/community/");
  const isAuthorActive = pathname === "/author" || pathname.startsWith("/author/");
  const isProfileActive = pathname === "/profile" || pathname === "/account/security";
  const isNotificationsActive = pathname === "/notifications";
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const { profile, isLoading, logout } = useAuth();
  const { items: notifications, unreadCount, isLoading: notificationsLoading, markAsRead } = useNotifications();
  const canAccessAuthor = canAccessAuthorPanel(profile);

  useEffect(() => {
    if (!isMobileNavOpen && !isProfileMenuOpen && !isNotificationsOpen) {
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
        setIsNotificationsOpen(false);
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
        setIsNotificationsOpen(false);
      }
    }

    function closeOnScroll() {
      setIsMobileNavOpen(false);
      setIsProfileMenuOpen(false);
      setIsNotificationsOpen(false);
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
  }, [isMobileNavOpen, isNotificationsOpen, isProfileMenuOpen]);

  useEffect(() => {
    setIsMobileNavOpen(false);
    setIsProfileMenuOpen(false);
    setIsNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleHeaderOverlayOpen(event: Event) {
      const customEvent = event as CustomEvent<HeaderOverlayName>;

      if (customEvent.detail !== "mobile-nav") {
        setIsMobileNavOpen(false);
      }
      if (customEvent.detail !== "profile") {
        setIsProfileMenuOpen(false);
      }
      if (customEvent.detail !== "notifications") {
        setIsNotificationsOpen(false);
      }
    }

    window.addEventListener(getHeaderOverlayEventName(), handleHeaderOverlayOpen);
    return () => {
      window.removeEventListener(getHeaderOverlayEventName(), handleHeaderOverlayOpen);
    };
  }, []);

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
  const authorClass = `header-link rounded-full px-3.5 py-2 no-underline transition-all sm:px-4 ${
    isAuthorActive
      ? "header-link-filled bg-primary text-primary-content shadow-lg shadow-primary/28"
      : "bg-transparent text-base-content/88"
  }`;

  function closeMobileNav() {
    setIsMobileNavOpen(false);
  }

  function closeProfileMenu() {
    setIsProfileMenuOpen(false);
  }

  const recentNotifications = notifications.slice(0, 6);

  return (
    <div ref={headerRef} className="relative">
      <header
        className="glass-island flex items-center justify-between gap-3 rounded-3xl px-3 py-3 sm:px-5 sm:py-3.5"
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <LogoMark />
          <nav className="hidden items-center gap-1.5 lg:flex">
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
            {canAccessAuthor ? (
              <Link href="/author" className={authorClass}>
                Yazarlik
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {profile ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  const willOpen = !isNotificationsOpen;
                  if (willOpen) {
                    dispatchHeaderOverlayOpen("notifications");
                  }
                  setIsNotificationsOpen(willOpen);
                }}
                className={`relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-all ${
                  isNotificationsActive || isNotificationsOpen
                    ? "border-primary/30 bg-primary/12 text-primary"
                    : "border-base-content/14 bg-base-100/26 text-base-content/78"
                }`}
                aria-label="Bildirimleri ac"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 ? (
                  <span className="absolute right-1.5 top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-black text-primary-content">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </button>

              {isNotificationsOpen ? (
                <div className="glass-frame fixed left-4 right-4 top-[5.25rem] z-30 overflow-hidden rounded-[1.8rem] border border-base-content/14 bg-base-100/92 p-2 backdrop-blur-2xl sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+0.6rem)] sm:w-[min(26rem,calc(100vw-2rem))]">
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-base-content/10 bg-base-100/38 px-3.5 py-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-base-content/48">Bildirimler</p>
                      <p className="mt-1 text-sm font-semibold text-base-content/72">
                        {unreadCount > 0 ? `${unreadCount} okunmamis bildirim` : "Tum bildirimler okundu"}
                      </p>
                    </div>
                    <Link
                      href="/notifications"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="rounded-full border border-base-content/12 bg-base-100/46 px-3 py-1.5 text-xs font-bold text-base-content/78 no-underline transition hover:border-primary/30 hover:text-primary"
                    >
                      Tumunu Gor
                    </Link>
                  </div>

                  <div className="overlay-scroll-region mt-2 max-h-[26rem] space-y-2 overflow-y-auto">
                    {notificationsLoading ? (
                      <div className="rounded-2xl border border-base-content/10 bg-base-100/28 px-4 py-8 text-center text-sm font-semibold text-base-content/58">
                        Bildirimler yukleniyor...
                      </div>
                    ) : recentNotifications.length > 0 ? (
                      recentNotifications.map((item) => (
                        <div
                          key={item.id}
                          className={`rounded-2xl border px-3.5 py-3 ${
                            item.isRead
                              ? "border-base-content/10 bg-base-100/24"
                              : "border-primary/18 bg-primary/8"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`mt-1 inline-flex h-2.5 w-2.5 rounded-full ${item.isRead ? "bg-base-content/18" : "bg-primary"}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-black text-base-content/88">{item.title}</p>
                              <p className="mt-1 text-sm leading-relaxed text-base-content/68">{item.message}</p>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                {item.actionUrl ? (
                                  <Link
                                    href={item.actionUrl}
                                    onClick={() => {
                                      if (!item.isRead) {
                                        void markAsRead(item.id);
                                      }
                                      setIsNotificationsOpen(false);
                                    }}
                                    className="rounded-full bg-base-100/60 px-3 py-1.5 text-xs font-bold text-base-content/78 no-underline transition hover:text-primary"
                                  >
                                    Git
                                  </Link>
                                ) : null}
                                {!item.isRead ? (
                                  <button
                                    type="button"
                                    onClick={() => void markAsRead(item.id)}
                                    className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/16"
                                  >
                                    Okundu isaretle
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-base-content/12 bg-base-100/18 px-4 py-8 text-center text-sm font-semibold text-base-content/55">
                        Henuz bildirimin yok.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          <ThemeSelector />
          {profile ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  const willOpen = !isProfileMenuOpen;
                  if (willOpen) {
                    dispatchHeaderOverlayOpen("profile");
                  }
                  setIsProfileMenuOpen(willOpen);
                }}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-all ${
                  isProfileActive || isProfileMenuOpen
                    ? "border-primary/30 bg-primary/12 text-primary"
                    : "border-base-content/14 bg-base-100/26 text-base-content/80"
                }`}
                aria-label="Profil menusu"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-base-100/34 text-xs font-black">
                  {profile.displayName.charAt(0).toUpperCase()}
                </span>
              </button>

              {isProfileMenuOpen ? (
                <div className="glass-frame fixed left-4 right-4 top-[5.25rem] z-30 overflow-hidden rounded-[1.8rem] border border-base-content/14 bg-base-100/92 p-2 backdrop-blur-2xl sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+0.6rem)] sm:w-[min(22rem,calc(100vw-2rem))]">
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-base-content/10 bg-base-100/38 px-3.5 py-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-base-content/48">Profil</p>
                      <p className="mt-1 text-sm font-semibold text-base-content/72">{profile.displayName}</p>
                    </div>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-base-100/40 text-sm font-black text-primary">
                      {profile.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <Link
                    href="/profile#profile"
                    onClick={closeProfileMenu}
                    className="mt-2 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-base-content/82 no-underline transition hover:bg-base-100/38 hover:text-primary"
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
              className="header-link header-link-filled inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-content no-underline shadow-lg shadow-primary/28 transition-all hover:opacity-90 sm:h-auto sm:w-auto sm:rounded-full sm:px-4 sm:py-2"
              aria-label="Giris Yap"
            >
              <LogIn className="h-4.5 w-4.5 sm:hidden" />
              <span className="hidden sm:inline">{isLoading ? "Yukleniyor" : "Giris Yap"}</span>
            </Link>
          )}
          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-base-content/85 transition-all lg:hidden ${
              isMobileNavOpen
                ? "border-primary/30 bg-primary/14 text-primary shadow-lg shadow-primary/18"
                : "border-base-content/18 bg-base-100/24"
            }`}
            aria-label={isMobileNavOpen ? "Menuyu kapat" : "Menuyu ac"}
            onClick={() => {
              const willOpen = !isMobileNavOpen;
              if (willOpen) {
                dispatchHeaderOverlayOpen("mobile-nav");
              }
              setIsMobileNavOpen(willOpen);
            }}
          >
            {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {isMobileNavOpen ? (
        <nav className="glass-frame absolute left-0 right-0 top-[calc(100%+0.75rem)] z-40 overflow-hidden rounded-[2rem] border border-base-content/16 bg-base-100/90 p-3 shadow-2xl backdrop-blur-2xl lg:hidden">
          <div className="mb-3 flex items-center justify-between rounded-2xl border border-base-content/10 bg-base-100/28 px-4 py-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-base-content/48">Gezinme</p>
              <p className="mt-1 text-sm font-semibold text-base-content/76">Hizli erisim menusu</p>
            </div>
            <button
              type="button"
              onClick={closeMobileNav}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-base-content/14 bg-base-100/40 text-base-content/76 transition hover:border-primary/30 hover:text-primary"
              aria-label="Menuyu kapat"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href="/Books"
            className={`block rounded-2xl px-4 py-3 text-left text-sm font-semibold no-underline transition ${
              isDiscoverActive
                ? "bg-primary text-primary-content shadow-md shadow-primary/25"
                : "border border-base-content/10 bg-base-200/60 text-base-content/86"
            }`}
          >
            Kesfet
          </Link>
          <Link
            href="/Updates"
            className={`block rounded-2xl px-4 py-3 text-left text-sm font-semibold no-underline transition ${
              isUpdatesActive
                ? "bg-primary text-primary-content shadow-md shadow-primary/25"
                : "border border-base-content/10 bg-base-200/60 text-base-content/86"
            }`}
          >
            Guncellemeler
          </Link>
          <Link
            href="/announcements"
            className={`block rounded-2xl px-4 py-3 text-left text-sm font-semibold no-underline transition ${
              isAnnouncementsActive
                ? "bg-primary text-primary-content shadow-md shadow-primary/25"
                : "border border-base-content/10 bg-base-200/60 text-base-content/86"
            }`}
          >
            Duyurular
          </Link>
          <Link
            href="/community"
            className={`block rounded-2xl px-4 py-3 text-left text-sm font-semibold no-underline transition ${
              isCommunityActive
                ? "bg-primary text-primary-content shadow-md shadow-primary/25"
                : "border border-base-content/10 bg-base-200/60 text-base-content/86"
            }`}
          >
            Topluluk
          </Link>
          {canAccessAuthor ? (
            <Link
              href="/author"
              className={`block rounded-2xl px-4 py-3 text-left text-sm font-semibold no-underline transition sm:col-span-2 ${
                isAuthorActive
                  ? "bg-primary text-primary-content shadow-md shadow-primary/25"
                  : "border border-base-content/10 bg-base-200/60 text-base-content/86"
              }`}
            >
              Yazarlik
            </Link>
          ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
