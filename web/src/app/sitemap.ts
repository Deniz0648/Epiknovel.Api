import { MetadataRoute } from 'next';

type SitemapBook = {
  slug: string;
  updatedAt?: string | null;
  createdAt: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.SITE_URL || 'https://epiknovel.com';

  const routes = [
    '',
    '/Books',
    '/community',
    '/announcements',
    '/support',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  try {
    const backendBaseUrl = process.env.BACKEND_BASE_URL || "http://epiknovel_api:8080/api";
    const res = await fetch(`${backendBaseUrl}/Books/list?take=1000`, {
      next: { revalidate: 3600 },
      cache: "force-cache",
    });
    if (!res.ok) throw new Error(`Sitemap books fetch failed: ${res.status}`);
    const books = await res.json() as SitemapBook[];

    if (Array.isArray(books)) {
      const bookRoutes = books.map((book) => ({
        url: `${baseUrl}/Books/${book.slug}`,
        lastModified: new Date(book.updatedAt || book.createdAt),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
      return [...routes, ...bookRoutes];
    }
  } catch (error) {
    console.error('[SITEMAP] Failed to fetch books for sitemap:', error);
  }

  return routes;
}
