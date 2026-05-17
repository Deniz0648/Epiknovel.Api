import { Metadata } from "next";
import { Suspense } from "react";
import DiscoveryView from "../../components/book/discovery-view";

export const metadata: Metadata = {
  title: "Keşfet - Binlerce Hikaye Seni Bekliyor",
  description: "En yeni, en popüler ve en yüksek puanlı kitapları keşfedin. Kategori, durum ve yaş aralığına göre filtreleyerek size en uygun hikayeyi bulun.",
  openGraph: {
    title: "Keşfet - EpikNovel",
    description: "Binlerce orijinal ve çeviri hikaye arasından dilediğinizi seçin ve hemen okumaya başlayın.",
    type: "website",
  },
  alternates: {
    canonical: "https://epiknovel.com/Books",
  }
};

export default function Page() {
  return (
    <Suspense fallback={<main className="site-shell mx-auto min-h-screen px-4 pb-8 pt-28 sm:px-8 sm:pb-12 sm:pt-32" />}>
      <DiscoveryView />
    </Suspense>
  );
}
