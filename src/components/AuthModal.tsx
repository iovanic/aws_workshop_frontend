"use client";

import { useCallback, useEffect, useId, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { CredentialsAuthForm } from "@/components/auth/CredentialsAuthForm";
import { SignUpForm } from "@/components/auth/SignUpForm";

type Tab = "signIn" | "signUp";

export function AuthModal() {
  const { authModalOpen, closeAuthModal, refreshAuth } = useAuth();
  const titleId = useId();
  const [tab, setTab] = useState<Tab>("signIn");

  useEffect(() => {
    if (!authModalOpen) {
      setTab("signIn");
    }
  }, [authModalOpen]);

  useEffect(() => {
    if (!authModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAuthModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [authModalOpen, closeAuthModal]);

  const afterSignIn = useCallback(async () => {
    await refreshAuth();
    closeAuthModal();
  }, [refreshAuth, closeAuthModal]);

  if (!authModalOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Cerrar ventana de acceso"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={closeAuthModal}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id={titleId} className="text-lg font-bold text-sky-100">
            Acceso a la tienda
          </h2>
          <button
            type="button"
            onClick={closeAuthModal}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Mismo usuario Cognito del taller (pool <code className="text-slate-400">workshop-pool</code>
          , cliente <code className="text-slate-400">shop-user-client</code>).
        </p>

        <div className="mt-4 flex gap-1 rounded-lg bg-slate-800/80 p-1">
          <button
            type="button"
            onClick={() => setTab("signIn")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              tab === "signIn"
                ? "bg-sky-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setTab("signUp")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              tab === "signUp"
                ? "bg-emerald-700 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Crear cuenta
          </button>
        </div>

        <div className="mt-5">
          {tab === "signIn" ? (
            <CredentialsAuthForm compact onSuccess={afterSignIn} />
          ) : (
            <SignUpForm compact onSignedUp={refreshAuth} />
          )}
        </div>
      </div>
    </div>
  );
}
