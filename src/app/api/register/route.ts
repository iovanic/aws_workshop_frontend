import { NextResponse } from "next/server";

import { fetchFromAPI, getBearerFromRequest } from "@/lib/api";
import {
  decodeJwtPayload,
  emailFromIdTokenPayload,
} from "@/lib/jwt-payload";

export type RegisterBody = {
  name: string;
  phone: string;
  address: string;
};

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
 * Tras registro/verificación Cognito: crea o actualiza el cliente en RDS
 * (`POST /customers`) con el email del IdToken.
 */
export async function POST(request: Request) {
  const token = getBearerFromRequest(request);
  if (!token) {
    return NextResponse.json(
      { error: "Se requiere Authorization: Bearer <IdToken>" },
      { status: 401 }
    );
  }

  const email = emailFromIdTokenPayload(decodeJwtPayload(token));
  if (!email) {
    return NextResponse.json(
      { error: "No se pudo leer el email del token" },
      { status: 400 }
    );
  }

  let bodyJson: RegisterBody;
  try {
    bodyJson = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const name = (bodyJson.name ?? "").trim();
  const phone = (bodyJson.phone ?? "").trim();
  const address = (bodyJson.address ?? "").trim();

  if (!name || !phone || !address) {
    return NextResponse.json(
      { error: "name, phone y address son obligatorios" },
      { status: 400 }
    );
  }

  const upstreamBody = JSON.stringify({
    email,
    name,
    shipping_address: address,
    phone_number: phone,
  });

  try {
    const upstream = await fetchFromAPI(
      "/customers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: upstreamBody,
      },
      token
    );
    return forwardUpstream(upstream);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al contactar la API";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
