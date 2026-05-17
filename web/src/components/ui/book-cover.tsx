import Image from "next/image";
import { COVER_DEFAULT as DEFAULT_COVER } from "@/lib/api";

function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}

interface BookCoverProps {
  src?: string | null;
  alt: string;
  className?: string;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  blurDataUrl?: string | null;
  sizes?: string;
}

/**
 * Kitap Kapakları İçin Optimize Edilmiş Ortak Bileşen
 * AOT (Ahead of Time) varyasyonları ve Responsive Image mantığını kullanır.
 */
export function BookCover({
  src,
  alt,
  className,
  fill = true,
  priority = false,
  quality = 75,
  blurDataUrl,
  sizes = "(max-width: 768px) 150px, (max-width: 1200px) 300px, 600px",
}: BookCoverProps) {
  const imageSrc = src || DEFAULT_COVER;

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <Image
        src={imageSrc}
        alt={alt}
        fill={fill}
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        quality={quality}
        placeholder={blurDataUrl ? "blur" : "empty"}
        blurDataURL={blurDataUrl || undefined}
        sizes={sizes}
        className="object-cover"
      />
    </div>
  );
}
