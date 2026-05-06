"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { CredentialsAuthForm } from "@/components/auth/CredentialsAuthForm";
import { useAuth } from "@/context/AuthContext";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next")?.trim() || "/";
  const { refreshAuth } = useAuth();

  async function afterSignIn() {
    await refreshAuth();
    router.push(nextPath.startsWith("/") ? nextPath : "/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-700/80 bg-slate-900/60 p-8 shadow-xl">
        <h1 className="text-xl font-bold text-sky-100">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-slate-400">
          Usuario del pool Cognito del taller (mismo email/contraseña que en CLI).
        </p>
        <div className="mt-6">
          <CredentialsAuthForm onSuccess={afterSignIn} />
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="text-sky-400 hover:underline">
            Volver al catálogo
          </Link>
          {" · "}
          <button
            type="button"
            className="text-sky-400 hover:underline"
            onClick={() => router.back()}
          >
            Atrás
          </button>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-16">
          <p className="mx-auto max-w-md text-center text-slate-400">Cargando…</p>
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
