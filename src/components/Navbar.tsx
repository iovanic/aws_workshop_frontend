"use client";

import Link from "next/link";
import { useShopName } from "@/context/ShopNameContext";
import { useCart } from "@/hooks/useCart";

export function Navbar() {
  const { itemCount } = useCart();
  const shopName = useShopName();

  return (
    <header className="sticky top-0 z-40 border-b border-sky-800/20 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-sky-100 md:text-xl"
        >
          {shopName}
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-slate-300 transition hover:text-sky-300"
          >
            Catálogo
          </Link>
          <Link
            href="/cart"
            className="relative inline-flex items-center gap-1.5 rounded-lg border border-sky-600/50 bg-sky-600/20 px-3 py-1.5 text-sm font-medium text-sky-200 transition hover:bg-sky-600/30"
          >
            Carrito
            {itemCount > 0 && (
              <span
                className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold text-slate-900"
                aria-label={`${itemCount} artículos en el carrito`}
              >
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
