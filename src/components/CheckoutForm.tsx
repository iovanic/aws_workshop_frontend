"use client";

import { useForm } from "react-hook-form";
import { useCart } from "@/hooks/useCart";
import { formatEuro } from "@/lib/format";

export type CheckoutFormValues = {
  email: string;
  phone: string;
  address: string;
};

const emailPattern =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

type Props = {
  onSuccess: () => void;
};

export function CheckoutForm({ onSuccess }: Props) {
  const { clearCart, subtotalCents, lines, hydrated } = useCart();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    defaultValues: { email: "", phone: "", address: "" },
  });

  const onSubmit = (data: CheckoutFormValues) => {
    // eslint-disable-next-line no-console
    console.log("Pedido (demo):", { ...data, lineCount: lines.length });
    clearCart();
    onSuccess();
  };

  if (!hydrated) {
    return (
      <p className="text-slate-400" aria-live="polite">
        Cargando formulario…
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-6 space-y-4 rounded-2xl border border-slate-700/80 bg-slate-900/40 p-6"
      noValidate
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-sky-100">Finalizar compra</h2>
        <p className="text-amber-400">Total: {formatEuro(subtotalCents)}</p>
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          aria-invalid={errors.email ? "true" : "false"}
          {...register("email", {
            required: "El correo es obligatorio",
            pattern: {
              value: emailPattern,
              message: "Introduce un correo electrónico válido",
            },
          })}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-400" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="phone"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Teléfono
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          inputMode="numeric"
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          aria-invalid={errors.phone ? "true" : "false"}
          {...register("phone", {
            required: "El teléfono es obligatorio",
            validate: (v) => {
              const digits = (v || "").replace(/\D/g, "");
              if (digits.length < 9) {
                return "Mínimo 9 dígitos (solo números)";
              }
              if (!/^\d+$/.test(digits)) {
                return "Solo números";
              }
              return true;
            },
          })}
        />
        {errors.phone && (
          <p className="mt-1 text-sm text-red-400" role="alert">
            {errors.phone.message}
          </p>
        )}
        <p className="mt-0.5 text-xs text-slate-500">Solo números, 9+ dígitos</p>
      </div>

      <div>
        <label
          htmlFor="address"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Dirección de envío
        </label>
        <textarea
          id="address"
          rows={3}
          autoComplete="street-address"
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          aria-invalid={errors.address ? "true" : "false"}
          {...register("address", {
            required: "La dirección es obligatoria",
            minLength: {
              value: 8,
              message: "Indica una dirección completa (mín. 8 caracteres)",
            },
          })}
        />
        {errors.address && (
          <p className="mt-1 text-sm text-red-400" role="alert">
            {errors.address.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || lines.length === 0}
        className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Comprar
      </button>
    </form>
  );
}
