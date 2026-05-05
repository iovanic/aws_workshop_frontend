"use client";

import { createContext, useContext } from "react";

const ShopNameContext = createContext<string | null>(null);

export function ShopNameProvider({
  shopName,
  children,
}: {
  shopName: string;
  children: React.ReactNode;
}) {
  return (
    <ShopNameContext.Provider value={shopName}>
      {children}
    </ShopNameContext.Provider>
  );
}

export function useShopName(): string {
  const v = useContext(ShopNameContext);
  if (v == null) {
    throw new Error("useShopName must be used within ShopNameProvider");
  }
  return v;
}
