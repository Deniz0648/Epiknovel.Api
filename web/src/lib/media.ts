export function toMediaProxyUrl(sourceUrl?: string | null): string | null {
  if (!sourceUrl) {
    return null;
  }

  const appendProxyPath = (pathname: string) => {
    if (!pathname.startsWith("/uploads/")) {
      return sourceUrl;
    }

    return `/api/media/file?path=${encodeURIComponent(pathname)}`;
  };

  if (sourceUrl.startsWith("/uploads/")) {
    return appendProxyPath(sourceUrl);
  }

  try {
    const parsed = new URL(sourceUrl);
    return appendProxyPath(parsed.pathname);
  } catch {
    return sourceUrl;
  }
}
