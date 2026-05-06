import "server-only";

/**
 * Read at request time (Docker: set with `docker run -e ...`).
 * Bracket access avoids Next inlining NEXT_PUBLIC_* at build time.
 */
export function getShopName(): string {
  const raw =
    process.env["NEXT_PUBLIC_SHOP_NAME"]?.trim() ||
    process.env["SHOP_NAME"]?.trim() ||
    "";
  return raw || "Next Drones";
}
