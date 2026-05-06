"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useShopName } from "@/context/ShopNameContext";
import type { Product } from "@/types/product";
import { useCart } from "@/hooks/useCart";
import { useImageCarousel } from "@/hooks/useImageCarousel";
import { formatEuro } from "@/lib/format";

type Props = { product: Product };

export function DroneCard({ product }: Props) {
  const shopName = useShopName();
  const { addItem, getQuantity } = useCart();
  const qty = getQuantity(product.id);
  const { index, next, prev, goTo } = useImageCarousel(product.images.length);

  const imageSrc = useMemo(() => {
    if (product.images.length === 0) return null;
    return product.images[index];
  }, [product.images, index]);

  const description = useMemo(
    () => product.description.replaceAll("__SHOP_NAME__", shopName),
    [product.description, shopName]
  );

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/60 shadow-lg shadow-slate-950/50">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-800">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={`${product.name} — imagen ${index + 1} de ${product.images.length}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
            priority={false}
          />
        ) : (
          <div className="flex h-full min-h-[12rem] items-center justify-center bg-slate-800/80 text-sm text-slate-500">
            Sin imagen
          </div>
        )}
        {product.images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/70 p-2 text-sky-200 transition hover:bg-slate-800"
              aria-label="Imagen anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/70 p-2 text-sky-200 transition hover:bg-slate-800"
              aria-label="Imagen siguiente"
            >
              ›
            </button>
            <div
              className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5"
              role="tablist"
              aria-label="Galería"
            >
              {product.images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  className={`h-2 w-2 rounded-full transition ${
                    i === index ? "bg-sky-400" : "bg-slate-500/80"
                  }`}
                  aria-label={`Ver imagen ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
        {qty > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-slate-900">
            En carrito: {qty}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h2 className="text-lg font-semibold text-sky-100">{product.name}</h2>
        <p className="text-sm text-sky-300/90">{product.tagline}</p>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
          {description}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-xl font-bold text-amber-400">
            {formatEuro(product.price)}
          </p>
          <button
            type="button"
            onClick={() => addItem(product.id)}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            Agregar al carrito
          </button>
        </div>
      </div>
    </article>
  );
}
