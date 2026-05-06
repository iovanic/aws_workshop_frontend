"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DroneCard } from "@/components/DroneCard";
import type { Product } from "@/types/product";
import { useCart } from "@/hooks/useCart";

type LoadState = "loading" | "error" | "ready";

/**
 * Catálogo público: `GET /api/products` sin JWT (el BFF usa FastAPI o GW).
 */
export function CatalogGrid() {
  const { mergeCatalogFromApi } = useCart();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [products, setProducts] = useState<Product[]>([]);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const hasApiUrl = Boolean(
    (process.env.NEXT_PUBLIC_API_GW_URL ?? "").trim()
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!hasApiUrl) {
        setLoadState("error");
        setErrorDetail(
          "Falta NEXT_PUBLIC_API_GW_URL en el build del contenedor."
        );
        return;
      }

      setLoadState("loading");
      setErrorDetail(null);

      try {
        const res = await fetch("/api/products");

        const raw = await res.text();
        if (!res.ok) {
          if (!cancelled) {
            setLoadState("error");
            setErrorDetail(raw.slice(0, 400) || `HTTP ${res.status}`);
          }
          return;
        }

        let data: unknown;
        try {
          data = JSON.parse(raw) as unknown;
        } catch {
          if (!cancelled) {
            setLoadState("error");
            setErrorDetail("Respuesta no JSON de /api/products");
          }
          return;
        }

        if (!Array.isArray(data)) {
          if (!cancelled) {
            setLoadState("error");
            setErrorDetail("Formato de catálogo inesperado");
          }
          return;
        }

        const list = data as Product[];
        if (!cancelled) {
          setProducts(list);
          mergeCatalogFromApi(list);
          setLoadState("ready");
        }
      } catch (e) {
        if (!cancelled) {
          setLoadState("error");
          setErrorDetail(
            e instanceof Error ? e.message : "Error al cargar el catálogo"
          );
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [hasApiUrl, mergeCatalogFromApi]);

  if (!hasApiUrl) {
    return (
      <p className="rounded-xl border border-amber-600/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100/90">
        Falta configurar la URL de API Gateway en la imagen Docker (build-arg{" "}
        <code className="rounded bg-slate-900 px-1.5">NEXT_PUBLIC_API_GW_URL</code>
        ).
      </p>
    );
  }

  if (loadState === "loading") {
    return (
      <p className="text-slate-400" aria-live="polite">
        Cargando catálogo…
      </p>
    );
  }

  if (loadState === "error") {
    return (
      <div className="space-y-2 rounded-xl border border-red-600/40 bg-red-950/30 px-4 py-3 text-sm text-red-100/90">
        <p className="font-medium">No se pudo cargar el catálogo</p>
        {errorDetail && (
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs text-red-200/80">
            {errorDetail}
          </pre>
        )}
        <p className="text-slate-400">
          Si acabas de desplegar, comprueba{" "}
          <code className="rounded bg-slate-900 px-1">SERVER_FASTAPI_ORIGIN</code>{" "}
          en el <code className="rounded bg-slate-900 px-1">docker run</code> y
          recarga.{" "}
          <Link href="/" className="text-sky-400 underline">
            Recargar inicio
          </Link>
        </p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <p className="text-slate-400">
        No hay productos en la API. Ejecuta el seed en el contenedor de FastAPI (
        <code className="rounded bg-slate-800 px-1">python -m app.seed</code>).
      </p>
    );
  }

  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <li key={product.id}>
          <DroneCard product={product} />
        </li>
      ))}
    </ul>
  );
}
