"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { useShopName } from "@/context/ShopNameContext";
import { useCart } from "@/hooks/useCart";

export function Navbar() {
  const { itemCount } = useCart();
  const shopName = useShopName();
  const {
    user,
    isAuthenticated,
    isLoading,
    signOut,
    openAuthModal,
  } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const displayLabel =
    user?.displayName?.trim() || user?.email?.split("@")[0] || user?.email;

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
          {isLoading ? (
            <span className="text-sm text-slate-500">Sesión…</span>
          ) : isAuthenticated && user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex max-w-[10rem] items-center gap-1 truncate rounded-lg border border-slate-600/80 bg-slate-800/60 px-3 py-1.5 text-sm text-sky-100 hover:bg-slate-800 md:max-w-[14rem]"
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                <span className="truncate">{displayLabel}</span>
                <span className="text-slate-400" aria-hidden>
                  ▾
                </span>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl"
                  role="menu"
                >
                  <p className="truncate px-3 py-2 text-xs text-slate-500" title={user.email}>
                    {user.email}
                  </p>
                  <Link
                    href="/profile"
                    role="menuitem"
                    className="block px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                    onClick={closeMenu}
                  >
                    Mi cuenta
                  </Link>
                  <Link
                    href="/login"
                    role="menuitem"
                    className="block px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                    onClick={closeMenu}
                  >
                    Página de acceso
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full px-3 py-2 text-left text-sm text-red-300 hover:bg-slate-800"
                    onClick={() => {
                      closeMenu();
                      void signOut();
                    }}
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={openAuthModal}
                className="text-sm text-slate-300 transition hover:text-sky-300"
              >
                Entrar
              </button>
              <Link
                href="/login"
                className="hidden text-sm text-slate-500 underline-offset-2 hover:text-slate-300 sm:inline"
              >
                /login
              </Link>
            </>
          )}
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
