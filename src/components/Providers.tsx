"use client";

import { CartProvider } from "@/context/CartContext";
import { ShopNameProvider } from "@/context/ShopNameContext";

export function Providers({
  children,
  shopName,
}: {
  children: React.ReactNode;
  shopName: string;
}) {
  return (
    <ShopNameProvider shopName={shopName}>
      <CartProvider>{children}</CartProvider>
    </ShopNameProvider>
  );
}
