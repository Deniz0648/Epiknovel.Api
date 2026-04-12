import Link from "next/link";
import { Flame } from "lucide-react";
import { useSettings } from "@/components/providers/settings-provider";
import { resolveMediaUrl } from "@/lib/api";
import Image from "next/image";

export function LogoMark() {
  const { settings } = useSettings();
  const siteName = settings.SITE_Name || "EpikNovel";
  const logoUrl = resolveMediaUrl(settings.SITE_LogoUrl);

  return (
    <Link
      href="/"
      className="inline-flex items-center leading-none group transition-all"
      aria-label={`${siteName} ana sayfa`}
    >
      <span className="inline-flex h-11 min-w-[2.75rem] px-2 items-center justify-center rounded-xl bg-primary text-primary-content shadow-lg shadow-primary/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-primary/40 overflow-hidden border border-primary-focus/20">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={siteName}
            className="max-h-full max-w-full object-contain p-2" 
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) {
                const icon = parent.querySelector('.logo-fallback-icon');
                if (icon) (icon as HTMLElement).style.display = 'block';
              }
            }}
          />
        ) : null}
        <Flame 
          strokeWidth={2.5} 
          className={`h-6 w-6 logo-fallback-icon ${logoUrl ? 'hidden' : ''}`} 
          aria-hidden="true" 
        />
      </span>
    </Link>
  );
}
