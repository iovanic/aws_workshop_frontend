"use client";

import { useState } from "react";
import {
  confirmSignUp,
  fetchAuthSession,
  resendSignUpCode,
  signIn,
  signUp,
} from "aws-amplify/auth";

type Props = {
  onSignedUp: () => void | Promise<void>;
  compact?: boolean;
};

type Phase = "register" | "confirm";

const e164Pattern = /^\+[1-9]\d{7,14}$/;

async function syncCustomerToRds(
  idToken: string,
  profile: { name: string; phone: string; address: string }
) {
  const res = await fetch("/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t.slice(0, 300) || `HTTP ${res.status}`);
  }
}

/**
 * Alta con self-signup del pool (si el instructor lo permite en Cognito).
 * Incluye fase de código de verificación por email (`confirmSignUp`).
 * Perfil (nombre, teléfono E.164, dirección) se guarda en Cognito y en RDS vía `/api/register`.
 */
export function SignUpForm({ onSignedUp, compact }: Props) {
  const [phase, setPhase] = useState<Phase>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputClass = compact
    ? "w-full rounded-lg border border-slate-600 bg-slate-800/90 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
    : "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

  async function afterVerifiedAccount() {
    let session = await fetchAuthSession();
    let idToken = session.tokens?.idToken?.toString();
    if (!idToken) {
      const out = await signIn({ username: email, password });
      if (!out.isSignedIn) {
        throw new Error(
          "Inicia sesión manualmente en «Entrar» y visita «Mi cuenta» para sincronizar con la tienda."
        );
      }
      session = await fetchAuthSession();
      idToken = session.tokens?.idToken?.toString();
    }
    if (!idToken) {
      throw new Error("No hay IdToken tras iniciar sesión.");
    }
    await syncCustomerToRds(idToken, {
      name: fullName.trim(),
      phone: phoneE164.trim(),
      address: address.trim(),
    });
  }

  async function onSubmitRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!e164Pattern.test(phoneE164.trim())) {
      setError(
        "El teléfono debe estar en formato internacional E.164 (ej. +34612345678)."
      );
      return;
    }

    setLoading(true);
    try {
      const { isSignUpComplete, nextStep } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name: fullName.trim(),
            phone_number: phoneE164.trim(),
            address: address.trim(),
          },
        },
      });

      if (isSignUpComplete) {
        await afterVerifiedAccount();
        setInfo("Cuenta creada y perfil guardado en la tienda.");
        setPassword("");
        await onSignedUp();
        return;
      }

      if (nextStep.signUpStep === "CONFIRM_SIGN_UP") {
        setPhase("confirm");
        setInfo(
          "Te hemos enviado un código al correo. Introdúcelo abajo para activar la cuenta."
        );
        return;
      }

      setInfo("Registro recibido. Usa «Entrar» si ya puedes acceder.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const { isSignUpComplete, nextStep } = await confirmSignUp({
        username: email,
        confirmationCode: code.trim(),
      });

      if (isSignUpComplete || nextStep.signUpStep === "COMPLETE_AUTO_SIGN_IN") {
        await afterVerifiedAccount();
        setInfo("Cuenta verificada y perfil guardado en la tienda.");
        setPhase("register");
        setCode("");
        setPassword("");
        await onSignedUp();
        return;
      }

      setInfo("Verificación registrada. Inicia sesión y visita «Mi cuenta» si falta el perfil en la tienda.");
      await onSignedUp();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al confirmar");
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await resendSignUpCode({ username: email });
      setInfo("Hemos vuelto a enviar el código a tu correo.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al reenviar");
    } finally {
      setLoading(false);
    }
  }

  if (phase === "confirm") {
    return (
      <form className="space-y-4" onSubmit={onSubmitConfirm}>
        <p className="text-sm text-slate-400">
          Código enviado a <strong className="text-slate-200">{email}</strong>
        </p>
        <div>
          <label
            htmlFor="signup-code"
            className="mb-1 block text-sm font-medium text-slate-300"
          >
            Código de verificación
          </label>
          <input
            id="signup-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputClass}
            placeholder="123456"
          />
        </div>
        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="text-sm text-emerald-300/90" role="status">
            {info}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
        >
          {loading ? "Verificando…" : "Confirmar cuenta"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void onResend()}
          className="w-full rounded-xl border border-slate-600 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          Reenviar código
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setPhase("register");
            setCode("");
            setError(null);
            setInfo(null);
          }}
          className="w-full text-sm text-slate-500 underline hover:text-slate-300"
        >
          Volver al formulario
        </button>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmitRegister}>
      <div>
        <label
          htmlFor="signup-email"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Correo
        </label>
        <input
          id="signup-email"
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
          htmlFor="signup-fullname"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Nombre completo
        </label>
        <input
          id="signup-fullname"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="signup-phone"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Teléfono (E.164, ej. +34612345678)
        </label>
        <input
          id="signup-phone"
          type="tel"
          autoComplete="tel"
          required
          value={phoneE164}
          onChange={(e) => setPhoneE164(e.target.value)}
          className={inputClass}
          placeholder="+34…"
        />
      </div>
      <div>
        <label
          htmlFor="signup-address"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Dirección de envío
        </label>
        <textarea
          id="signup-address"
          rows={3}
          autoComplete="street-address"
          required
          minLength={8}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="signup-password"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Contraseña (mín. 8, política del pool)
        </label>
        <input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
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
      {info && (
        <p className="text-sm text-emerald-300/90" role="status">
          {info}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
      >
        {loading ? "Creando…" : "Crear cuenta"}
      </button>
    </form>
  );
}
