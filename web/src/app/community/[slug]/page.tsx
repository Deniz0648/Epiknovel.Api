import { Metadata } from "next";
import { backendApiRequest } from "@/lib/backend-api";
import { resolveMediaUrl } from "@/lib/api";
import ProfileView from "../../../components/community/profile-view";
import Script from "next/script";

type Props = {
  params: Promise<{ slug: string }>;
};

async function getProfileData(slug: string) {
  try {
    const profile = await backendApiRequest<any>(`/users/${slug}`, {
      next: { revalidate: 3600 }
    });
    return profile;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfileData(slug);

  if (!profile) {
    return {
      title: "Profil Bulunamadı",
      description: "Aradığınız profil sistemimizde bulunamadı.",
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
    return (
      <main className="relative overflow-hidden">
        <div className="site-shell mx-auto flex min-h-screen items-center justify-center px-4 sm:px-8">
          <p className="text-sm font-semibold text-error">Profil bulunamadı.</p>
        </div>
      </main>
    );
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
