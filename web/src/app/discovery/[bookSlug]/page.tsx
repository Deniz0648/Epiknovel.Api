import { permanentRedirect } from "next/navigation";

type Props = {
  params: Promise<{ bookSlug: string }>;
};

export default async function Page({ params }: Props) {
  const { bookSlug } = await params;
  permanentRedirect(`/Books/${bookSlug}`);
}
