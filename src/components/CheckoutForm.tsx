"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/hooks/useCart";
import { formatEuro } from "@/lib/format";

type Props = {
  onSuccess: () => void;
};

function hasCheckoutProfile(user: {
  email: string;
  displayName?: string;
  phone?: string;
  address?: string;
} | null): boolean {
  if (!user) return false;
  return Boolean(
    user.displayName?.trim() &&
      user.phone?.trim() &&
      user.address?.trim()
  );
}

export function CheckoutForm({ onSuccess }: Props) {
  const { user, getIdToken } = useAuth();
  const { clearCart, subtotal, lines, hydrated } = useCart();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const profileOk = hasCheckoutProfile(user);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!user || !profileOk) {
      setSubmitError("Completa tu perfil en «Mi cuenta» antes de comprar.");
      return;
    }

    const idToken = await getIdToken();
    if (!idToken) {
      setSubmitError(
        "Necesitas iniciar sesión: usa «Entrar» en la barra superior o /login y vuelve al carrito."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const items = lines.map(({ product, quantity }) => ({
        product_id: product.id,
        quantity,
      }));

      const payload = {
        customer_email: user.email,
        items,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const raw = await res.text();
        let detail = `Error ${res.status}`;
        try {
          const body = JSON.parse(raw) as { detail?: unknown };
          if (body.detail !== undefined) {
            detail =
              typeof body.detail === "string"
                ? body.detail
                : JSON.stringify(body.detail);
          }
        } catch {
          if (raw) detail = raw.slice(0, 200);
        }
        setSubmitError(detail);
        return;
      }

      clearCart();
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <p className="text-slate-400" aria-live="polite">
        Cargando formulario…
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 space-y-4 rounded-2xl border border-slate-700/80 bg-slate-900/40 p-6"
      noValidate
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-sky-100">Finalizar compra</h2>
        <p className="text-amber-400">Total: {formatEuro(subtotal)}</p>
      </div>

      {!profileOk && user && (
        <div className="rounded-lg border border-amber-600/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
          Faltan nombre, teléfono o dirección en tu cuenta Cognito.{" "}
          <Link href="/profile" className="font-medium text-sky-300 underline">
            Completa tu perfil
          </Link>
          .
        </div>
      )}

      {!user && (
        <p className="text-sm text-slate-400">
          Debes iniciar sesión para comprar.
        </p>
      )}

      {profileOk && user && (
        <div className="rounded-lg border border-slate-600/60 bg-slate-800/50 px-4 py-3 text-sm text-slate-300">
          <p>
            <span className="text-slate-500">Envío a:</span>{" "}
            <strong className="text-sky-100">{user.displayName}</strong>
          </p>
          <p className="mt-1">
            <span className="text-slate-500">Correo:</span> {user.email}
          </p>
          <p className="mt-1">
            <span className="text-slate-500">Teléfono:</span> {user.phone}
          </p>
          <p className="mt-1 whitespace-pre-wrap">
            <span className="text-slate-500">Dirección:</span> {user.address}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Los datos vienen de tu cuenta. Puedes editarlos en{" "}
            <Link href="/profile" className="text-sky-400 underline">
              Mi cuenta
            </Link>
            .
          </p>
        </div>
      )}

      {submitError && (
        <p
          className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200"
          role="alert"
        >
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || lines.length === 0 || !profileOk || !user}
        className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Procesando…" : "Comprar"}
      </button>
    </form>
  );
}
