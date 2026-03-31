import Link from "next/link";
import { Flame } from "lucide-react";

export function LogoMark() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 leading-none"
      aria-label="EpikNovel ana sayfa"
    >
      <span className="inline-flex h-6 w-6 items-center justify-center text-primary">
        <Flame strokeWidth={1.9} className="h-4.5 w-4.5" aria-hidden="true" />
      </span>

      <span className="text-base font-extrabold tracking-tight sm:text-xl">
        <span className="text-primary">Epik</span>
        <span className="text-base-content">Novel</span>
      </span>
    </Link>
  );
}
