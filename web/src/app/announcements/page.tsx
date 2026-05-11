import { Metadata } from "next";
import AnnouncementsView from "@/components/announcements/announcements-view";

export const metadata: Metadata = {
  title: "Duyurular ve Güncellemeler",
  description: "EpikNovel platformu hakkındaki en son haberler, güncellemeler ve duyuruları buradan takip edin.",
  openGraph: {
    title: "Duyurular - EpikNovel",
    description: "Platform güncellemeleri ve resmi duyurular.",
    type: "website",
  },
  alternates: {
    canonical: "https://epiknovel.com/announcements",
  }
};

export default function Page() {
  return <AnnouncementsView />;
}
