import { NextResponse } from "next/server";

import {
  fetchFromAPI,
  fetchPublicProductById,
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

type Params = { params: { id: string } };

/** GET detalle: público sin token o con Bearer hacia API Gateway. */
export async function GET(request: Request, ctx: Params) {
  const token = getBearerFromRequest(request);
  const { id } = ctx.params;

  try {
    const upstream = token
      ? await fetchFromAPI(
          `/products/${encodeURIComponent(id)}`,
          { method: "GET" },
          token
        )
      : await fetchPublicProductById(id);
    return forwardUpstream(upstream);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al contactar la API";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
