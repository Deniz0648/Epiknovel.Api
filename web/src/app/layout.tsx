import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SiteFooter } from "@/components/layout/site-footer";
import { HeaderIsland } from "@/components/layout/header-island";
import { NotificationsProvider } from "@/components/providers/notifications-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { RealtimeProvider } from "@/components/providers/realtime-provider";

export const metadata: Metadata = {
  title: "EpikNovel",
  description: "Glassmorphism tabanli modern okuma platformu",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" data-theme="light" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ToastProvider>
          <RealtimeProvider>
            <AuthProvider>
              <NotificationsProvider>
                <div className="flex min-h-screen flex-col">
                <div id="global-header-container" className="fixed inset-x-0 top-0 z-50">
                  <div className="site-shell mx-auto px-4 pt-3 sm:px-8 sm:pt-4">
                    <HeaderIsland />
                  </div>
                </div>
                <div className="flex-1">{children}</div>
                <div id="global-footer-container">
                  <SiteFooter />
                </div>
              </div>
            </NotificationsProvider>
          </AuthProvider>
        </RealtimeProvider>
      </ToastProvider>
    </body>
    </html>
  );
}
