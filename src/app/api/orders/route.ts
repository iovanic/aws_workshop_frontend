import { NextResponse } from "next/server";

import { fetchFromAPI, getBearerFromRequest } from "@/lib/api";

async function forwardUpstream(upstream: Response) {
  const contentType =
    upstream.headers.get("content-type") ?? "application/json";
  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": contentType },
  });
}

/** Proxy GET /orders → API Gateway. */
export async function GET(request: Request) {
  const token = getBearerFromRequest(request);
  if (!token) {
    return NextResponse.json(
      { error: "Se requiere cabecera Authorization: Bearer <IdToken>" },
      { status: 401 }
    );
  }

  try {
    const upstream = await fetchFromAPI("/orders", { method: "GET" }, token);
    return forwardUpstream(upstream);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al contactar la API";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** Proxy POST /orders → API Gateway (cuerpo JSON sin modificar). */
export async function POST(request: Request) {
  const token = getBearerFromRequest(request);
  if (!token) {
    return NextResponse.json(
      { error: "Se requiere cabecera Authorization: Bearer <IdToken>" },
      { status: 401 }
    );
  }

  const bodyText = await request.text();

  try {
    const upstream = await fetchFromAPI(
      "/orders",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyText,
      },
      token
    );
    return forwardUpstream(upstream);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al contactar la API";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
