"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  fetchAuthSession,
  fetchUserAttributes,
  updateUserAttribute,
} from "aws-amplify/auth";

import { useAuth } from "@/context/AuthContext";

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

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, refreshAuth, getIdToken } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [address, setAddress] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadAttrs = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const attrs = await fetchUserAttributes();
      setFullName(attrs.name ?? "");
      setPhoneE164(attrs.phone_number ?? "");
      setAddress(attrs.address ?? "");
    } catch {
      // atributos pueden no existir aún
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadAttrs();
  }, [loadAttrs]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!e164Pattern.test(phoneE164.trim())) {
      setErr("Teléfono en formato E.164 (ej. +34612345678).");
      return;
    }
    setSaving(true);
    try {
      await updateUserAttribute({ userAttribute: { attributeKey: "name", value: fullName.trim() } });
      await updateUserAttribute({
        userAttribute: { attributeKey: "phone_number", value: phoneE164.trim() },
      });
      await updateUserAttribute({
        userAttribute: { attributeKey: "address", value: address.trim() },
      });
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      if (!idToken) throw new Error("No hay IdToken.");
      await syncCustomerToRds(idToken, {
        name: fullName.trim(),
        phone: phoneE164.trim(),
        address: address.trim(),
      });
      setMsg("Perfil actualizado en Cognito y en la base de datos de la tienda.");
      await refreshAuth();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function onSyncOnly() {
    setErr(null);
    setMsg(null);
    setSaving(true);
    try {
      const idToken = await getIdToken();
      if (!idToken) throw new Error("Inicia sesión de nuevo.");
      await syncCustomerToRds(idToken, {
        name: fullName.trim(),
        phone: phoneE164.trim(),
        address: address.trim(),
      });
      setMsg("Cliente sincronizado en la base de datos.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error al sincronizar");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-16">
        <p className="text-slate-400">Cargando…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-16">
        <p className="text-slate-300">
          <Link href="/login" className="text-sky-400 underline">
            Inicia sesión
          </Link>{" "}
          para ver tu cuenta.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 px-4 py-16">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold text-sky-100">Mi cuenta</h1>
        {user?.email && (
          <p className="mt-1 text-sm text-slate-500">{user.email}</p>
        )}
        <p className="mt-2 text-sm text-slate-400">
          Nombre, teléfono y dirección se guardan en Cognito y en la tienda (RDS)
          para los pedidos.
        </p>

        <form className="mt-8 space-y-4" onSubmit={onSave}>
          <div>
            <label htmlFor="prof-name" className="mb-1 block text-sm text-slate-300">
              Nombre completo
            </label>
            <input
              id="prof-name"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="prof-phone" className="mb-1 block text-sm text-slate-300">
              Teléfono (E.164)
            </label>
            <input
              id="prof-phone"
              type="tel"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100"
              value={phoneE164}
              onChange={(e) => setPhoneE164(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="prof-addr" className="mb-1 block text-sm text-slate-300">
              Dirección de envío
            </label>
            <textarea
              id="prof-addr"
              rows={3}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {err && (
            <p className="text-sm text-red-400" role="alert">
              {err}
            </p>
          )}
          {msg && (
            <p className="text-sm text-emerald-300" role="status">
              {msg}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-sky-600 py-3 font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar y sincronizar con la tienda"}
          </button>
        </form>
        <button
          type="button"
          disabled={saving}
          onClick={() => void onSyncOnly()}
          className="mt-3 w-full rounded-xl border border-slate-600 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
        >
          Solo sincronizar RDS (sin cambiar Cognito)
        </button>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="text-sky-400 hover:underline">
            Volver al catálogo
          </Link>
        </p>
      </div>
    </div>
  );
}
