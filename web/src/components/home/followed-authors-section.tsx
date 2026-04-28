"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { apiRequest, resolveMediaUrl } from "@/lib/api";
import { PopularAuthorsRow } from "./popular-authors-row";

type AuthorItem = {
  userId: string;
  displayName: string;
  slug: string;
  avatarUrl?: string;
  followersCount: number;
  booksCount: number;
};

export function PopularAuthorsSection() {
  const [authors, setAuthors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Popüler yazarları getir
    apiRequest<any>("/users?isAuthor=true&sortBy=followers&sortDirection=desc&pageSize=6")
      .then((data) => {
        const mappedAuthors = data.items.map((a: any) => ({
          id: a.userId,
          name: a.displayName || "Anonim Yazar",
          initials: (a.displayName || "A Y").split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
          specialty: "Popüler Yazar",
          followers: (a.followersCount || 0) > 1000 ? `${((a.followersCount || 0) / 1000).toFixed(1)}K` : String(a.followersCount || 0),
          seriesCount: a.booksCount || 0,
          avatarUrl: resolveMediaUrl(a.avatarUrl, "profiles")
        }));
        setAuthors(mappedAuthors);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (!isLoading && authors.length === 0) return null;

  return (
    <>
      {isLoading ? (
        <section className="space-y-3">
          <div className="h-8 w-64 rounded-lg bg-base-content/10 animate-pulse" />
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-frame h-32 animate-pulse bg-base-content/5 rounded-2xl" />
            ))}
          </div>
        </section>
      ) : (
        <PopularAuthorsRow authors={authors} title="Popüler Yazarlar" icon={Trophy} />
      )}
    </>
  );
}
