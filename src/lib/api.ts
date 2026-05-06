import "server-only";

const apiGwBase = () =>
  (process.env.NEXT_PUBLIC_API_GW_URL ?? "").replace(/\/$/, "");

/**
 * Petición directa a API Gateway con el **ID token** del usuario (no access token).
 * Uso: Server Components y Route Handlers del taller.
 */
export async function fetchFromAPI(
  path: string,
  init: RequestInit | undefined,
  idToken: string | undefined
): Promise<Response> {
  const base = apiGwBase();
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_GW_URL no está definida");
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${normalized}`;

  const headers = new Headers(init?.headers);
  if (idToken) {
    headers.set("Authorization", `Bearer ${idToken}`);
  }

  return fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });
}

function serverFastapiOrigin(): string {
  return (process.env.SERVER_FASTAPI_ORIGIN ?? "").trim().replace(/\/$/, "");
}

/**
 * Lectura de catálogo **sin JWT** (solo servidor): FastAPI directo si
 * `SERVER_FASTAPI_ORIGIN` está definido (recomendado en EC2 con API en :8000);
 * si no, intenta API Gateway sin cabecera Authorization (puede fallar en APIs Edge).
 */
export async function fetchPublicProductList(): Promise<Response> {
  const origin = serverFastapiOrigin();
  if (origin) {
    return fetch(`${origin}/products`, { method: "GET", cache: "no-store" });
  }
  return fetchFromAPI("/products", { method: "GET" }, undefined);
}

/** Detalle de producto sin JWT (misma lógica que `fetchPublicProductList`). */
export async function fetchPublicProductById(id: string): Promise<Response> {
  const enc = encodeURIComponent(id);
  const origin = serverFastapiOrigin();
  if (origin) {
    return fetch(`${origin}/products/${enc}`, {
      method: "GET",
      cache: "no-store",
    });
  }
  return fetchFromAPI(`/products/${enc}`, { method: "GET" }, undefined);
}

export function getBearerFromRequest(request: Request): string | undefined {
  const raw = request.headers.get("authorization");
  if (!raw) return undefined;
  const m = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return m?.[1]?.trim();
}
