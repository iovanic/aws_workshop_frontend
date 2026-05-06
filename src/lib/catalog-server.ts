import "server-only";

import { cache } from "react";

import type { Product } from "@/types/product";

import { fetchFromAPI, fetchPublicProductList } from "./api";
import { getServerIdToken } from "./getServerIdToken";

/**
 * Catálogo por petición (deduplicado con `cache` entre layout y página).
 * Con sesión SSR usa API Gateway con IdToken; sin sesión usa catálogo público
 * (FastAPI vía `SERVER_FASTAPI_ORIGIN` o GW sin token).
 */
export const getCatalogForRequest = cache(async (): Promise<Product[]> => {
  const base = (process.env.NEXT_PUBLIC_API_GW_URL ?? "").trim();
  const fastapi = (process.env.SERVER_FASTAPI_ORIGIN ?? "").trim();
  if (!base && !fastapi) {
    return [];
  }

  const token = await getServerIdToken();

  try {
    const res = token
      ? await fetchFromAPI("/products", { method: "GET" }, token)
      : await fetchPublicProductList();
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) {
      return [];
    }
    return data as Product[];
  } catch {
    return [];
  }
});
