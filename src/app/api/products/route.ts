import { NextResponse } from "next/server";

import {
  fetchFromAPI,
  fetchPublicProductList,
  getBearerFromRequest,
} from "@/lib/api";

async function forwardUpstream(upstream: Response) {
  const contentType =
    upstream.headers.get("content-type") ?? "application/json";
  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": contentType },
  });
}

/**
 * GET /products: catálogo **público** sin token (BFF → FastAPI vía
 * `SERVER_FASTAPI_ORIGIN` o GW sin Authorization). Con Bearer, sigue yendo a
 * API Gateway con IdToken (mismo comportamiento que antes).
 */
export async function GET(request: Request) {
  const token = getBearerFromRequest(request);

  try {
    const upstream = token
      ? await fetchFromAPI("/products", { method: "GET" }, token)
      : await fetchPublicProductList();
    return forwardUpstream(upstream);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al contactar la API";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
