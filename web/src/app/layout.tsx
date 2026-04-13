import type { Metadata } from "next";
import "./globals.css";
import { LayoutShell } from "@/components/layout/layout-shell";
import { AuthProvider } from "@/components/providers/auth-provider";
import { NotificationsProvider } from "@/components/providers/notifications-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { backendApiRequest } from "@/lib/backend-api";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await backendApiRequest<Record<string, string>>("/Settings/public", { cache: "no-store" });
    const siteName = settings?.SITE_Name || "EpikNovel";
    const slogan = settings?.SITE_Slogan || "Modern Okuma Platformu";
    const favicon = settings?.SITE_FaviconUrl || "/favicon.svg";

    return {
      title: {
        template: `%s | ${siteName}`,
        default: `${siteName} - ${slogan}`,
      },
      description: slogan,
      icons: {
        icon: favicon,
      },
    };
  } catch (e) {
    return {
      title: "EpikNovel",
      description: "Modern Okuma Platformu",
      icons: {
        icon: "/favicon.svg",
      },
    };
  }
}

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
