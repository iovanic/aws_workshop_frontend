"use client";

import { AuthModal } from "@/components/AuthModal";
import { ConfigureAmplify } from "@/components/ConfigureAmplify";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ShopNameProvider } from "@/context/ShopNameContext";
import type { Product } from "@/types/product";

export function Providers({
  children,
  shopName,
  initialCatalog,
}: {
  children: React.ReactNode;
  shopName: string;
  initialCatalog: Product[];
}) {
  return (
    <ShopNameProvider shopName={shopName}>
      <ConfigureAmplify />
      <AuthProvider>
        <AuthModal />
        <CartProvider initialCatalog={initialCatalog}>{children}</CartProvider>
      </AuthProvider>
    </ShopNameProvider>
  );
}
