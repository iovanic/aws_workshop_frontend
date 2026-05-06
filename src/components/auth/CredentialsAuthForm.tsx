"use client";

import { useState } from "react";
import { signIn } from "aws-amplify/auth";

type Props = {
  onSuccess: () => void | Promise<void>;
  /** Estilos más compactos para el modal */
  compact?: boolean;
};

/**
 * Formulario email/contraseña (USER_PASSWORD_AUTH), compartido por `/login` y `AuthModal`.
 */
export function CredentialsAuthForm({ onSuccess, compact }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputClass = compact
    ? "w-full rounded-lg border border-slate-600 bg-slate-800/90 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
    : "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const out = await signIn({ username: email, password });
      if (out.isSignedIn) {
        await onSuccess();
        return;
      }
      setError(
        "Sesión incompleta (p. ej. cambio de contraseña obligatorio). Contacta al instructor."
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label
          htmlFor={compact ? "auth-modal-email" : "login-email"}
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Correo
        </label>
        <input
          id={compact ? "auth-modal-email" : "login-email"}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor={compact ? "auth-modal-password" : "login-password"}
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Contraseña
        </label>
        <input
          id={compact ? "auth-modal-password" : "login-password"}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </div>
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
