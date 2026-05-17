import { Metadata } from "next";
import { backendApiRequest } from "@/lib/backend-api";
import { resolveMediaUrl } from "@/lib/api";
import ProfileView from "../../../components/community/profile-view";
import Script from "next/script";
import type { PublicUserProfile } from "@/lib/auth";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

type PublicUserListItem = {
  slug: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isAuthor?: boolean;
};

type PublicUserListResponse = {
  items: PublicUserListItem[];
};

async function getProfileData(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();
  const encodedSlug = encodeURIComponent(slug);
  try {
    const profile = await backendApiRequest<PublicUserProfile>(`/users/${encodedSlug}`, {
      next: { revalidate: 3600 }
    });
    return profile;
  } catch {
    // Fallback 1: go through Next API route (adds forwarded headers/token handling)
    try {
      const proxyRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://test.epiknovel.com"}/api/users/${encodedSlug}`, {
        cache: "no-store",
      });
      if (proxyRes.ok) {
        const proxyPayload = await proxyRes.json() as { isSuccess?: boolean; data?: PublicUserProfile };
        if (proxyPayload?.isSuccess && proxyPayload.data) {
          return proxyPayload.data;
        }
      }
    } catch {
      // continue to list fallback
    }

    try {
      const list = await backendApiRequest<PublicUserListResponse>(
        `/users?query=${encodeURIComponent(normalizedSlug)}&pageNumber=1&pageSize=20`,
        { next: { revalidate: 300 } }
      );

      const match = list.items.find((item) => item.slug?.toLowerCase() === normalizedSlug);
      if (!match) return null;

      const fallbackProfile: PublicUserProfile = {
        slug: match.slug,
        displayName: match.displayName,
        bio: match.bio,
        avatarUrl: match.avatarUrl,
        followersCount: match.followersCount,
        followingCount: match.followingCount,
        isFollowing: match.isFollowing,
        isAuthor: match.isAuthor ?? false,
        isRedirected: false
      };

      return fallbackProfile;
    } catch {
      return null;
    }
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfileData(slug);

  if (!profile) {
    return {
      title: "Topluluk Profili - EpikNovel",
      description: "EpikNovel topluluk profili.",
      alternates: {
        canonical: `https://epiknovel.com/community/${slug}`,
      }
    };
  }

  const title = `${profile.displayName} (@${profile.slug}) - EpikNovel`;
  const description = profile.bio?.substring(0, 160) || `${profile.displayName} kullanıcısının EpikNovel profili.`;
  const image = resolveMediaUrl(profile.avatarUrl, "profiles") || "https://epiknovel.com/favicon.svg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image],
      type: "profile",
      username: profile.slug,
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [image],
    },
    alternates: {
      canonical: `https://epiknovel.com/community/${slug}`,
    }
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const profile = await getProfileData(slug);

  if (!profile) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "mainEntity": {
      "@type": "Person",
      "name": profile.displayName,
      "identifier": profile.slug,
      "description": profile.bio,
      "image": resolveMediaUrl(profile.avatarUrl, "profiles"),
      "interactionStatistic": [
        {
          "@type": "InteractionCounter",
          "interactionType": "https://schema.org/FollowAction",
          "userInteractionCount": profile.followersCount
        }
      ]
    }
  };

  return (
    <>
      <Script
        id="profile-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProfileView initialData={profile} slug={slug} />
    </>
  );
}
