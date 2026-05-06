/** Decodifica el payload JSON de un JWT (sin verificar firma). Solo para leer claims del IdToken. */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    let b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad) b64 += "=".repeat(4 - pad);
    // atob() devuelve Latin-1; el payload JWT es UTF-8 → usar TextDecoder
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder("utf-8").decode(bytes);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function emailFromIdTokenPayload(
  payload: Record<string, unknown> | null
): string | null {
  if (!payload) return null;
  const email =
    (typeof payload.email === "string" && payload.email) ||
    (typeof payload["cognito:username"] === "string" &&
      payload["cognito:username"]) ||
    "";
  return email.trim() || null;
}
