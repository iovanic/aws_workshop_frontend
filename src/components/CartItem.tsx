"use client";

import Image from "next/image";
import type { CartLine } from "@/context/CartContext";
import { useCart } from "@/hooks/useCart";
import { formatEuro } from "@/lib/format";

type Props = { line: CartLine };

export function CartItem({ line }: Props) {
  const { updateQty, removeItem } = useCart();
  const { drone, quantity } = line;
  const cover = drone.images[0] ?? "";
  const lineTotal = drone.price * quantity;

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-slate-700/80 bg-slate-900/50 p-3 sm:flex-row sm:items-center">
      <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-lg bg-slate-800 sm:h-24 sm:w-32">
        {cover ? (
          <Image
            src={cover}
            alt={drone.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 128px"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-sky-100">{drone.name}</h3>
        <p className="text-sm text-slate-400">
          {formatEuro(drone.price)} c/u
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <div className="flex items-center gap-2">
          <label htmlFor={`qty-${drone.id}`} className="sr-only">
            Cantidad para {drone.name}
          </label>
          <input
            id={`qty-${drone.id}`}
            type="number"
            min={1}
            max={99}
            value={quantity}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (Number.isNaN(n)) return;
              updateQty(drone.id, n);
            }}
            className="w-16 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-center text-slate-200"
          />
        </div>
        <p className="w-24 text-right font-medium text-amber-400">
          {formatEuro(lineTotal)}
        </p>
        <button
          type="button"
          onClick={() => removeItem(drone.id)}
          className="text-sm text-red-400 hover:underline"
        >
          Quitar
        </button>
      </div>
    </li>
  );
}
