import { Suspense } from "react";

import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main
      className="mx-auto flex min-h-screen max-w-[430px] flex-col items-center justify-center px-6 py-10"
      style={{ background: "#F8F4EC" }}
    >
      {/* Logo / marque */}
      <div className="mb-8 text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold text-white"
          style={{ background: "#1A3828" }}
        >
          E
        </div>
        <p
          className="mt-3 font-display text-xl font-bold"
          style={{ color: "#1A3828" }}
        >
          Easyfest
        </p>
      </div>

      {/* Card formulaire */}
      <div
        className="w-full rounded-3xl p-8"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 2px 24px rgba(26,56,40,0.10)",
        }}
      >
        <Suspense fallback={<LoginSkeleton />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}

function LoginSkeleton() {
  return (
    <div className="w-full space-y-6">
      <div>
        <p
          className="text-xs font-bold uppercase tracking-[0.2em]"
          style={{ color: "#C49A2C" }}
        >
          Connexion à ton espace
        </p>
        <h1
          className="mt-2 font-display text-3xl font-bold"
          style={{ color: "#1A3828" }}
        >
          Salut 👋
        </h1>
        <p className="mt-2 text-sm" style={{ color: "#7A7060" }}>
          Chargement…
        </p>
      </div>
    </div>
  );
}
