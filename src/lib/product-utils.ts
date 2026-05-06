import type { Product } from "@/types/product";

export function placeholderProduct(id: string): Product {
  return {
    id,
    name: `Producto (${id})`,
    tagline: "",
    description:
      "No pudimos cargar los detalles. Inicia sesión o vuelve al catálogo.",
    price: 0,
    images: [],
  };
}
