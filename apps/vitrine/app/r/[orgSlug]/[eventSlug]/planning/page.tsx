import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function Page({ params }: Props) {
  const { orgSlug, eventSlug } = await params;
  redirect(`/regie/${orgSlug}/${eventSlug}/planning`);
}
