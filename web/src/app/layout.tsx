import type { Metadata } from "next";
import "./globals.css";
import { LayoutShell } from "@/components/layout/layout-shell";
import { AuthProvider } from "@/components/providers/auth-provider";
import { NotificationsProvider } from "@/components/providers/notifications-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "EpikNovel";
const siteDescription =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "Modern Okuma Platformu";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://epiknovel.com"),
  title: {
    template: `%s | ${siteName}`,
    default: `${siteName} - ${siteDescription}`,
  },
  description: siteDescription,
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const storedTheme = localStorage.getItem('theme');
                  if (storedTheme) {
                    document.documentElement.setAttribute('data-theme', storedTheme);
                  } else {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <SettingsProvider>
          <ToastProvider>
            <AuthProvider>
              <NotificationsProvider>
                 <LayoutShell>
                    {children}
                 </LayoutShell>
              </NotificationsProvider>
            </AuthProvider>
          </ToastProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
