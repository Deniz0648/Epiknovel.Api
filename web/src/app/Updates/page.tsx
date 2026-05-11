import { Metadata } from "next";
import UpdatesView from "@/components/updates/updates-view";

export const metadata: Metadata = {
  title: "Son Güncellemeler - Yeni Bölümler",
  description: "Platformdaki en son kitap güncellemelerini, yeni eklenen bölümleri ve güncel içerikleri takip edin. Hikayenize kaldığınız yerden devam edin.",
  openGraph: {
    title: "Güncellemeler - EpikNovel",
    description: "Yeni bölümler ve kitap güncellemeleri.",
    type: "website",
  },
  alternates: {
    canonical: "https://epiknovel.com/Updates",
  }
};

export default function Page() {
  return <UpdatesView />;
}
