import { Metadata } from "next";
import { Suspense } from "react";
import DiscoveryView from "../../components/book/discovery-view";

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const hasFilter = !!resolvedSearchParams && Object.keys(resolvedSearchParams).length > 0;
  return {
    title: "Keşfet - Binlerce Hikaye Seni Bekliyor",
    description: "En yeni, en popüler ve en yüksek puanlı kitapları keşfedin. Kategori, durum ve yaş aralığına göre filtreleyerek size en uygun hikayeyi bulun.",
    openGraph: {
      title: "Keşfet - EpikNovel",
      description: "Binlerce orijinal ve çeviri hikaye arasından dilediğinizi seçin ve hemen okumaya başlayın.",
      type: "website",
    },
    alternates: { canonical: "https://epiknovel.com/discovery" },
    robots: hasFilter ? { index: false, follow: true } : { index: true, follow: true }
  };
}

export default function Page() {
  return (
    <Suspense fallback={<main className="site-shell mx-auto min-h-screen px-4 pb-8 pt-28 sm:px-8 sm:pb-12 sm:pt-32" />}>
      <DiscoveryView />
    </Suspense>
  );
}
