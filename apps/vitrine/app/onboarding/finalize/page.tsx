import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter, SiteHeader } from "@/components/site-header";

import { finalizeFestivalRequest } from "@/app/actions/onboard-self-serve";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function FinalizePage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return <ErrorPanel message="Token manquant dans l'URL." />;
  }

  const res = await finalizeFestivalRequest({ token });

  if (res.ok && res.redirectTo) {
    redirect(res.redirectTo);
  }

  return <ErrorPanel message={res.error ?? "Impossible de finaliser ta demande."} />;
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-cream">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12 sm:py-20">
        <div className="rounded-3xl border-2 border-red-200 bg-red-50 p-6 text-center sm:p-8">
          <div aria-hidden className="text-5xl">😕</div>
          <h1 className="mt-3 font-display text-2xl font-black text-red-700">
            Lien invalide
          </h1>
          <p className="mt-2 text-sm text-brand-ink/80">{message}</p>
          <p className="mt-4 text-xs text-brand-ink/60">
            Les liens magiques sont valables 24h. Si le tien a expiré, recommence ta demande.
          </p>
          <Link
            href="/demande-festival"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-brand-coral px-5 py-3 text-sm font-semibold text-brand-cream transition hover:opacity-90"
            style={{ minHeight: "44px" }}
          >
            🚀 Recommencer une demande
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
