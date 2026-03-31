import Link from "next/link";
import { Mail, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/layout/logo-mark";

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-7xl px-4 pb-6 pt-10 sm:px-8 sm:pb-8 sm:pt-12">
      <div className="glass-frame rounded-3xl p-5 sm:p-7">
        <div className="grid gap-7 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <LogoMark />
            <p className="max-w-md text-sm leading-relaxed text-base-content/70">
              Her bolumde yeni bir dunya ac. EpikNovel, modern bir okuma deneyimi icin tasarlandi.
            </p>
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-base-content/60">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Her gun yeni hikayeler
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-[0.14em] text-base-content/60">Kesfet</h3>
            <nav className="flex flex-col gap-2">
              <Link href="/Books" className="text-sm font-semibold text-base-content/82 no-underline hover:text-primary">
                Kitaplar
              </Link>
              <Link href="/Updates" className="text-sm font-semibold text-base-content/82 no-underline hover:text-primary">
                Guncellemeler
              </Link>
              <Link
                href="/announcements"
                className="text-sm font-semibold text-base-content/82 no-underline hover:text-primary"
              >
                Duyurular
              </Link>
            </nav>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-[0.14em] text-base-content/60">Iletisim</h3>
            <a
              href="mailto:hello@epiknovel.com"
              className="inline-flex items-center gap-2 rounded-full border border-base-content/16 bg-base-100/24 px-3.5 py-2 text-sm font-semibold text-base-content/82 no-underline transition hover:border-primary/40 hover:text-primary"
            >
              <Mail className="h-4 w-4" />
              hello@epiknovel.com
            </a>
          </div>
        </div>

        <div className="mt-6 border-t border-base-content/12 pt-4 text-xs text-base-content/55">
          © {new Date().getFullYear()} EpikNovel. Tum haklari saklidir.
        </div>
      </div>
    </footer>
  );
}
