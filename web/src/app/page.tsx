import { ContinueReadingSection } from "@/components/home/continue-reading";
import { HeroFrame } from "@/components/home/hero-frame";
import { MostReadRow } from "@/components/home/most-read-row";
import { PopularAuthorsRow } from "@/components/home/popular-authors-row";
import { ReaderExperiencesRow } from "@/components/home/reader-experiences-row";
import { RecommendationsRow } from "@/components/home/recommendations-row";
import { UpdatesFeed } from "@/components/home/updates-feed";

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div className="site-shell mx-auto flex min-h-screen flex-col gap-6 px-4 pb-6 pt-28 sm:px-8 sm:pb-10 sm:pt-32">
        <HeroFrame />
        <ContinueReadingSection />
        <UpdatesFeed />
        <RecommendationsRow />
        <PopularAuthorsRow />
        <MostReadRow />
        <ReaderExperiencesRow />
      </div>
    </main>
  );
}
