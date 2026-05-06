"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  fetchAuthSession,
  getCurrentUser,
  signOut as amplifySignOut,
} from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

import { isAmplifyConfigured } from "@/lib/amplify";
import { decodeJwtPayload } from "@/lib/jwt-payload";

export type AuthUser = {
  email: string;
  displayName?: string;
  /** E.164 desde claim `phone_number` */
  phone?: string;
  /** Dirección desde claim `address` */
  address?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  /** IdToken JWT para API Gateway (mismo token que en Sprint 4). */
  getIdToken: () => Promise<string | null>;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  authModalOpen: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function addressFromPayload(payload: Record<string, unknown>): string | undefined {
  const raw = payload.address;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }
  if (
    typeof raw === "object" &&
    raw !== null &&
    "formatted" in raw &&
    typeof (raw as { formatted?: unknown }).formatted === "string"
  ) {
    const f = (raw as { formatted: string }).formatted.trim();
    return f || undefined;
  }
  return undefined;
}

function payloadToUser(
  payload: Record<string, unknown> | null
): AuthUser | null {
  if (!payload) return null;
  const email =
    (typeof payload.email === "string" && payload.email) ||
    (typeof payload["cognito:username"] === "string" &&
      payload["cognito:username"]) ||
    "";
  if (!email) return null;
  const displayName =
    (typeof payload.name === "string" && payload.name) ||
    (typeof payload.given_name === "string" && payload.given_name) ||
    undefined;
  const phone =
    typeof payload.phone_number === "string" && payload.phone_number.trim()
      ? payload.phone_number.trim()
      : undefined;
  const address = addressFromPayload(payload);
  return { email, displayName, phone, address };
}

async function loadUserFromSession(): Promise<AuthUser | null> {
  if (!isAmplifyConfigured()) {
    return null;
  }
  try {
    await getCurrentUser();
  } catch {
    return null;
  }
  const session = await fetchAuthSession();
  const idToken = session.tokens?.idToken?.toString();
  if (!idToken) return null;
  return payloadToUser(decodeJwtPayload(idToken));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const refreshAuth = useCallback(async () => {
    if (!isAmplifyConfigured()) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const u = await loadUserFromSession();
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    const unsub = Hub.listen("auth", ({ payload }) => {
      const { event } = payload;
      if (
        event === "signedIn" ||
        event === "signedOut" ||
        event === "tokenRefresh"
      ) {
        void refreshAuth();
      }
    });
    return unsub;
  }, [refreshAuth]);

  const signOut = useCallback(async () => {
    if (!isAmplifyConfigured()) {
      setUser(null);
      return;
    }
    try {
      await amplifySignOut();
    } catch {
      // sesión ya inválida
    }
    setUser(null);
    setAuthModalOpen(false);
  }, []);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!isAmplifyConfigured()) return null;
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() ?? null;
    } catch {
      return null;
    }
  }, []);

  const openAuthModal = useCallback(() => setAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      refreshAuth,
      signOut,
      getIdToken,
      openAuthModal,
      closeAuthModal,
      authModalOpen,
    }),
    [
      user,
      isLoading,
      refreshAuth,
      signOut,
      getIdToken,
      openAuthModal,
      closeAuthModal,
      authModalOpen,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}
