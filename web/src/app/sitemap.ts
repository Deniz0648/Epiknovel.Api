import { MetadataRoute } from 'next';
import { backendApiRequest } from '@/lib/backend-api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.SITE_URL || 'https://epiknovel.com';

  const routes = [
    '',
    '/Books',
    '/community',
    '/announcements',
    '/support',
    '/login',
    '/register',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  try {
    // Kitaplari dinamik olarak ekle
    // Not: Build sirasinda backend ayakta degilse burasi hata verebilir.
    // Bu yüzden try-catch icinde ve fallback mekanizmali olmali.
    const books = await backendApiRequest<any[]>('/Books/list?take=1000', {
        next: { revalidate: 3600 }
    });

    if (Array.isArray(books)) {
      const bookRoutes = books.map((book: any) => ({
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
