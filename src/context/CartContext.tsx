"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";

import { placeholderProduct } from "@/lib/product-utils";
import type { Product } from "@/types/product";

const STORAGE_KEY = "next-drones-cart";

export type CartState = Record<string, number>;

export type CartAction =
  | { type: "ADD_ITEM"; id: string }
  | { type: "REMOVE_ITEM"; id: string }
  | { type: "UPDATE_QTY"; id: string; quantity: number }
  | { type: "CLEAR_CART" }
  | { type: "HYDRATE"; payload: CartState };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE":
      return { ...action.payload };
    case "ADD_ITEM": {
      const current = state[action.id] ?? 0;
      return { ...state, [action.id]: current + 1 };
    }
    case "REMOVE_ITEM": {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [action.id]: _removed, ...rest } = state;
      return rest;
    }
    case "UPDATE_QTY": {
      if (action.quantity <= 0) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [action.id]: _removed, ...rest } = state;
        return rest;
      }
      return { ...state, [action.id]: action.quantity };
    }
    case "CLEAR_CART":
      return {};
    default:
      return state;
  }
}

export type CartLine = {
  product: Product;
  quantity: number;
};

type CartContextValue = {
  state: CartState;
  hydrated: boolean;
  addItem: (id: string) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, quantity: number) => void;
  clearCart: () => void;
  mergeCatalogFromApi: (products: Product[]) => void;
  lines: CartLine[];
  /** Suma de líneas en euros (coincide con `product.price` de la API). */
  subtotal: number;
  itemCount: number;
  getQuantity: (id: string) => number;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as CartState;
    }
  } catch {
    // ignore
  }
  return {};
}

function buildProductMap(products: Product[]): Record<string, Product> {
  return Object.fromEntries(products.map((p) => [p.id, p]));
}

export function CartProvider({
  children,
  initialCatalog,
}: {
  children: React.ReactNode;
  initialCatalog: Product[];
}) {
  const [state, dispatch] = useReducer(cartReducer, {});
  const [hydrated, setHydrated] = useState(false);
  const [clientCatalog, setClientCatalog] = useState<Product[]>([]);

  const mergeCatalogFromApi = useCallback((products: Product[]) => {
    setClientCatalog((prev) => {
      const map = buildProductMap([...prev, ...products]);
      return Object.values(map);
    });
  }, []);

  const productById = useMemo(() => {
    return buildProductMap([...initialCatalog, ...clientCatalog]);
  }, [initialCatalog, clientCatalog]);

  // Hydrate from localStorage on client
  useEffect(() => {
    const stored = readStorage();
    dispatch({ type: "HYDRATE", payload: stored });
    setHydrated(true);
  }, []);

  // Persist when state changes (after first hydrate)
  useEffect(() => {
    if (!hydrated) return;
    if (Object.keys(state).length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, hydrated]);

  const addItem = useCallback((id: string) => {
    dispatch({ type: "ADD_ITEM", id });
  }, []);

  const removeItem = useCallback((id: string) => {
    dispatch({ type: "REMOVE_ITEM", id });
  }, []);

  const updateQty = useCallback((id: string, quantity: number) => {
    dispatch({ type: "UPDATE_QTY", id, quantity });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  const lines = useMemo((): CartLine[] => {
    return Object.entries(state)
      .map(([id, quantity]) => {
        if (quantity <= 0) return null;
        const product = productById[id] ?? placeholderProduct(id);
        return { product, quantity };
      })
      .filter((v): v is CartLine => v !== null);
  }, [state, productById]);

  const subtotal = useMemo(() => {
    return lines.reduce((acc, { product, quantity }) => {
      return acc + product.price * quantity;
    }, 0);
  }, [lines]);

  const itemCount = useMemo(() => {
    return Object.values(state).reduce((a, b) => a + b, 0);
  }, [state]);

  const getQuantity = useCallback(
    (id: string) => state[id] ?? 0,
    [state]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      state,
      hydrated,
      addItem,
      removeItem,
      updateQty,
      clearCart,
      mergeCatalogFromApi,
      lines,
      subtotal,
      itemCount,
      getQuantity,
    }),
    [
      state,
      hydrated,
      addItem,
      removeItem,
      updateQty,
      clearCart,
      mergeCatalogFromApi,
      lines,
      subtotal,
      itemCount,
      getQuantity,
    ]
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCartContext must be used within CartProvider");
  }
  return ctx;
}
