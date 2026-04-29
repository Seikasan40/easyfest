import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 text-6xl">🔍</div>
      <h1 className="font-display text-3xl font-bold">Page introuvable</h1>
      <p className="mt-3 text-brand-ink/70">
        Le festival ou la ressource demandée n'existe pas (encore).
      </p>
      <Link
        href="/"
        className="mt-8 rounded-xl bg-brand-coral px-6 py-3 font-medium text-white"
      >
        Retour à l'accueil
      </Link>
    </main>
  );
}
