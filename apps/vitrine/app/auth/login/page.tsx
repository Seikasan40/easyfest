import { Suspense } from "react";

import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
      <Suspense fallback={<LoginSkeleton />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

function LoginSkeleton() {
  return (
    <div className="w-full space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-brand-coral">
          Connexion sans mot de passe
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold">Salut 👋</h1>
        <p className="mt-2 text-brand-ink/70">Chargement…</p>
      </div>
    </div>
  );
}
