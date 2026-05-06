"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CartItem } from "@/components/CartItem";
import { CheckoutForm } from "@/components/CheckoutForm";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/hooks/useCart";
import { useShopName } from "@/context/ShopNameContext";
import { formatEuro } from "@/lib/format";

type Step = "cart" | "checkout" | "thanks";

export function CartView() {
  const router = useRouter();
  const { lines, subtotal, hydrated, clearCart } = useCart();
  const shopName = useShopName();
  const { isAuthenticated, isLoading, openAuthModal } = useAuth();
  const [step, setStep] = useState<Step>("cart");

  const canCheckout = useMemo(
    () => lines.length > 0 && subtotal > 0,
    [lines.length, subtotal]
  );

  const onPurchaseSuccess = useCallback(() => {
    setStep("thanks");
  }, []);

  const onBackToCatalog = useCallback(() => {
    setStep("cart");
  }, []);

  const goToCheckout = useCallback(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push("/login?next=/cart");
      return;
    }
    setStep("checkout");
  }, [isAuthenticated, isLoading, router]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-10">
        <p className="text-slate-400" aria-live="polite">
          Cargando carrito…
        </p>
      </div>
    );
  }

  if (step === "thanks") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-16">
        <div className="mx-auto max-w-lg rounded-2xl border border-emerald-600/30 bg-slate-900/80 p-8 text-center shadow-xl">
          <p className="text-2xl font-bold text-emerald-400 md:text-3xl">
            Gracias por comprar en {shopName}
          </p>
          <p className="mt-3 text-slate-400">
            Tu pedido (de demostración) ha quedado registrado. Vuelve al catálogo
            para seguir soñando con el cielo.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex rounded-xl bg-sky-600 px-5 py-2.5 font-semibold text-white hover:bg-sky-500"
            >
              Volver al inicio
            </Link>
            <button
              type="button"
              onClick={onBackToCatalog}
              className="text-slate-400 underline hover:text-slate-200"
            >
              Cerrar mensaje
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-sky-100">Carrito</h1>
        {lines.length === 0 ? (
          <p className="mt-4 text-slate-400">
            Tu carrito está vacío.{" "}
            <Link href="/" className="text-sky-400 hover:underline">
              Ver catálogo
            </Link>
          </p>
        ) : (
          <>
            <ul className="mt-6 space-y-4" aria-label="Artículos en el carrito">
              {lines.map((line) => (
                <CartItem key={line.product.id} line={line} />
              ))}
            </ul>
            <div className="mt-6 flex items-center justify-between border-t border-slate-700/80 pt-4">
              <p className="text-lg text-slate-300">Subtotal</p>
              <p className="text-xl font-bold text-amber-400">
                {formatEuro(subtotal)}
              </p>
            </div>
            {step === "cart" && (
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={goToCheckout}
                    disabled={!canCheckout || isLoading}
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? "Comprobando sesión…" : "Comprar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        // eslint-disable-next-line no-alert
                        confirm("¿Vaciar el carrito?")
                      ) {
                        clearCart();
                      }
                    }}
                    className="text-sm text-slate-500 hover:text-red-400"
                  >
                    Vaciar carrito
                  </button>
                </div>
                {!isLoading && !isAuthenticated && (
                  <p className="text-sm text-slate-500">
                    Para pagar necesitas una sesión Cognito.{" "}
                    <button
                      type="button"
                      className="text-sky-400 underline hover:text-sky-300"
                      onClick={openAuthModal}
                    >
                      Entrar en ventana emergente
                    </button>
                    {" o "}
                    <Link href="/login?next=/cart" className="text-sky-400 underline">
                      ir a la página de acceso
                    </Link>
                    .
                  </p>
                )}
              </div>
            )}
            {step === "checkout" && isAuthenticated && (
              <div>
                <button
                  type="button"
                  onClick={() => setStep("cart")}
                  className="mb-2 text-sm text-sky-400 hover:underline"
                >
                  ← Volver al resumen
                </button>
                <CheckoutForm onSuccess={onPurchaseSuccess} />
              </div>
            )}
            {step === "checkout" && !isLoading && !isAuthenticated && (
              <div className="mt-4 rounded-xl border border-amber-600/40 bg-slate-900/60 p-4">
                <p className="text-slate-300">
                  Tu sesión ha expirado o no estás identificado. Vuelve a iniciar
                  sesión para finalizar el pedido.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("cart");
                      openAuthModal();
                    }}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
                  >
                    Entrar
                  </button>
                  <Link
                    href="/login?next=/cart"
                    className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                  >
                    Página de acceso
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
