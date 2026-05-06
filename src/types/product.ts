/** Catálogo alineado con `ProductOut` de la API (FastAPI / API Gateway). */
export type Product = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Precio en céntimos (p. ej. 32900 = 329,00 €) */
  price: number;
  images: string[];
};
