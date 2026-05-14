"use client";

import { usePathname } from "next/navigation";
import { HeaderIsland } from "./header-island";
import { SiteFooter } from "./site-footer";
import { SearchModal } from "@/components/ui/search-modal";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isManagement = pathname.startsWith("/management");

  if (isManagement) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-2xl focus:bg-primary focus:px-6 focus:py-3 focus:font-bold focus:text-primary-content focus:shadow-2xl focus:outline-none focus:ring-4 focus:ring-primary/40"
      >
        Icerige Atla
      </a>
      <div id="global-header-container" className="fixed inset-x-0 top-0 z-50">
        <div className="site-shell mx-auto px-4 pt-3 sm:px-8 sm:pt-4">
          <HeaderIsland />
          <SearchModal />
        </div>
      </div>
      <div id="main-content" className="flex-1 outline-none" tabIndex={-1}>
        {children}
      </div>
      <div id="global-footer-container">
        <SiteFooter />
      </div>
    </div>
  );
}
