"use client";

import { useCartContext } from "@/context/CartContext";

/**
 * Re-export the cart context as a named hook (plan + ergonomic API).
 */
export function useCart() {
  return useCartContext();
}
