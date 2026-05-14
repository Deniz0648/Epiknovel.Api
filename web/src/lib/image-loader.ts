import { API_BASE_URL } from "@/lib/api";

/**
 * Epiknovel Özel Görsel Yükleyici (Custom Image Loader)
 * Next.js'in istediği genişliği (width), backend'deki AOT varyasyonlarımıza (150, 300, 600) yönlendirir.
 */
export default function epiknovelImageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  // Eğer src zaten tam bir URL ise (örn. başka bir domain), loader'ı devreden çıkarabiliriz
  if (src.startsWith('http')) return src;

  // Path temizliği
  let cleanPath = src;
  if (cleanPath.includes('path=')) {
      const urlParams = new URLSearchParams(cleanPath.split('?')[1]);
      cleanPath = urlParams.get('path') || cleanPath;
  }
  
  // Multiple slashes ve uploads prefixlerini temizle
  cleanPath = cleanPath.replace(/\\/g, "/").replace(/\/+/g, "/");
  cleanPath = cleanPath.replace(/(wwwroot\/)?uploads?\//gi, "");

  if (cleanPath.startsWith("/")) {
    cleanPath = cleanPath.substring(1);
  }

  // Next.js'in istediği width değerini bizim varyasyonlarımıza (100, 200, 300, 450, 600) yuvarla
  let targetWidth = 600;
  if (width <= 120) targetWidth = 100;
  else if (width <= 240) targetWidth = 200;
  else if (width <= 350) targetWidth = 300;
  else if (width <= 520) targetWidth = 450;
  else targetWidth = 600;

  // API Endpoint'imize yönlendir
  return `${API_BASE_URL}/media/image?path=${encodeURIComponent(cleanPath)}&w=${targetWidth}&q=${quality || 70}`;
}
