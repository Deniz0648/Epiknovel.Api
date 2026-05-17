import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarClock, ChevronLeft, Megaphone } from "lucide-react";
import { backendApiRequest } from "@/lib/backend-api";
import { resolveMediaUrl } from "@/lib/api";

type AnnouncementItem = {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  isPinned: boolean;
  createdAt: string;
};

type AnnouncementsResponse = {
  items: AnnouncementItem[];
};

type Props = {
  params: Promise<{ id: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" });

async function getAnnouncement(id: string) {
  const payload = await backendApiRequest<AnnouncementsResponse>("/infrastructure/announcements?pageSize=100");
  return payload.items.find((item) => item.id === id) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = await getAnnouncement(id);
  if (!item) return { title: "Duyuru Bulunamadı - EpikNovel" };

  return {
    title: `${item.title} - EpikNovel`,
    description: item.content.slice(0, 160),
    alternates: { canonical: `https://epiknovel.com/announcements/${id}` },
  };
}

export default async function AnnouncementDetailPage({ params }: Props) {
  const { id } = await params;
  const item = await getAnnouncement(id);
  if (!item) notFound();

  const imageUrl = resolveMediaUrl(item.imageUrl);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="site-shell mx-auto flex flex-col gap-6 px-4 pb-12 pt-28 sm:px-8 sm:pt-32">
        <section className="glass-frame space-y-5 p-4 sm:p-6">
          <div className="breadcrumbs text-xs font-semibold text-base-content/50 mb-1">
            <ul>
              <li><Link href="/" className="hover:text-primary transition-colors">Ana Sayfa</Link></li>
              <li><Link href="/announcements" className="hover:text-primary transition-colors">Duyurular</Link></li>
              <li className="text-base-content/40">Detay</li>
            </ul>
          </div>

          <Link href="/announcements" className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary hover:opacity-80">
            <ChevronLeft className="h-4 w-4" /> Listeye Dön
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-primary">
              <Megaphone className="h-3 w-3" />
              {item.isPinned ? "One Cikan" : "Duyuru"}
            </p>
            <p className="inline-flex items-center gap-1 text-xs font-semibold text-base-content/60">
              <CalendarClock className="h-3.5 w-3.5" />
              {dateFormatter.format(new Date(item.createdAt))}
            </p>
          </div>

          <h1 className="text-2xl font-black leading-tight sm:text-3xl">{item.title}</h1>

          {imageUrl ? (
            <div className="overflow-hidden rounded-2xl border border-base-content/12 bg-base-100/20">
              <Image
                src={imageUrl}
                alt={item.title}
                width={1200}
                height={675}
                className="h-auto max-h-[260px] w-full object-cover sm:max-h-[340px]"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 960px"
              />
            </div>
          ) : null}

          <article className="prose prose-sm max-w-none whitespace-pre-line text-base-content/85 sm:prose-base">
            {item.content}
          </article>
        </section>
      </div>
    </main>
  );
}

