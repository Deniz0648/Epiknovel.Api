import { Metadata } from "next";
import CommunityView from "@/components/community/community-view";

export const metadata: Metadata = {
  title: "Topluluk - Okurlar ve Yazarlar Buluşuyor",
  description: "EpikNovel topluluğuna katılın. Favori yazarlarınızı takip edin, yeni okurlarla tanışın ve hikaye dünyasının bir parçası olun.",
  openGraph: {
    title: "Topluluk - EpikNovel",
    description: "Yazarlar ve okurların buluşma noktası. Profilleri inceleyin ve etkileşime geçin.",
    type: "website",
  },
  alternates: {
    canonical: "https://epiknovel.com/community",
  }
};

export default function Page() {
  return <CommunityView />;
}
