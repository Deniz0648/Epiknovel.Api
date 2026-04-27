import { resolveMediaUrl } from "./api";

/**
 * Medya URL'lerini frontend proxy üzerinden çözümler.
 * resolveMediaUrl ile aynı işi yapar, geriye uyumluluk ve null desteği için wrapper olarak sunulmuştur.
 */
export function toMediaProxyUrl(sourceUrl?: string | null): string | null {
  if (!sourceUrl) {
    return null;
  }

  return resolveMediaUrl(sourceUrl);
}
