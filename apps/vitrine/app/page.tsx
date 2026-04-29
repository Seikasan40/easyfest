import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16">
      <p className="mb-4 text-sm font-medium uppercase tracking-widest text-brand-coral">
        Field Test 0.0.1
      </p>
      <h1 className="text-balance text-center font-display text-5xl font-bold leading-tight md:text-6xl">
        Le festival pro,
        <br />
        <span className="text-brand-coral">sans le prix pro.</span>
      </h1>
      <p className="mt-6 max-w-xl text-balance text-center text-lg text-brand-ink/70">
        Easyfest remplace ton tableau Excel partagé, ton WhatsApp et ton outil
        d'inscription par une seule app pensée pour les organisateurs de festivals
        associatifs.
      </p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/icmpaca"
          className="rounded-xl bg-brand-coral px-6 py-3 font-medium text-white shadow-soft transition hover:opacity-90"
        >
          Découvrir RDL 2026 →
        </Link>
        <a
          href="#beta"
          className="rounded-xl border border-brand-ink/15 bg-white/60 px-6 py-3 font-medium text-brand-ink backdrop-blur transition hover:bg-white"
        >
          Rejoindre la beta
        </a>
      </div>

      <footer className="mt-24 text-xs text-brand-ink/50">
        Built by Easyfest · DPA Supabase EU signé ·{" "}
        <Link href="/legal/privacy" className="underline">Confidentialité</Link>
      </footer>
    </main>
  );
}
