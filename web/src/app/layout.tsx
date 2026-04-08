import type { Metadata } from "next";
import "./globals.css";
import { LayoutShell } from "@/components/layout/layout-shell";
import { AuthProvider } from "@/components/providers/auth-provider";
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
        <ToastProvider>
          <RealtimeProvider>
            <AuthProvider>
              <NotificationsProvider>
                 <LayoutShell>
                    {children}
                 </LayoutShell>
              </NotificationsProvider>
            </AuthProvider>
          </RealtimeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
