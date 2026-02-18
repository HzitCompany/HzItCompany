import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { getJson, postJson } from "../services/apiClient";

export type MeUser = {
  id: string;
  full_name: string | null;
  /** also available as email */
  email: string | null;
  role: "user" | "admin" | "client";
  provider: "otp" | "google" | "password" | null;
  isVerified?: boolean;
};

type MeResponse = { ok: true; user: MeUser };

type AuthContextValue = {
  user: MeUser | null;
  role: MeUser["role"] | null;
  isLoading: boolean;
  isAuthed: boolean;

  refreshMe: () => Promise<void>;

  isAuthModalOpen: boolean;
  openAuthModal: (opts?: { afterAuthNavigateTo?: string }) => void;
  closeAuthModal: () => void;
  /** Call after email OTP verified – triggers a refreshMe from cookie session. */
  onOtpVerified: () => Promise<void>;
  /** Call after Google login – triggers a refreshMe from cookie session. */
  onGoogleLogin: () => Promise<void>;

  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<MeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const afterAuthNavigateToRef = useRef<string | null>(null);

  const isAuthed = !!user;
  const role = user?.role ?? null;

  const fetchMe = useCallback(async () => {
    const me = await getJson<MeResponse>("/api/auth/me");
    setUser(me.user);
  }, []);

  // On mount, try to restore session from HTTP-only cookie via /api/auth/me.
  useEffect(() => {
    setIsLoading(true);
    fetchMe()
      .catch(() => {
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [fetchMe]);

  const refreshMe = useCallback(async () => {
    await fetchMe();
  }, [fetchMe]);

  const openAuthModal = useCallback(
    (opts?: { afterAuthNavigateTo?: string }) => {
      afterAuthNavigateToRef.current = opts?.afterAuthNavigateTo ?? null;
      setIsAuthModalOpen(true);
    },
    []
  );

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    afterAuthNavigateToRef.current = null;
  }, []);

  const onOtpVerified = useCallback(async () => {
    await fetchMe();
    setIsAuthModalOpen(false);

    const target = afterAuthNavigateToRef.current;
    afterAuthNavigateToRef.current = null;
    if (target && target !== location.pathname) {
      navigate(target);
    }
  }, [fetchMe, location.pathname, navigate]);

  const onGoogleLogin = useCallback(async () => {
    await fetchMe();
    setIsAuthModalOpen(false);

    const target = afterAuthNavigateToRef.current;
    afterAuthNavigateToRef.current = null;
    if (target && target !== location.pathname) {
      navigate(target);
    }
  }, [fetchMe, location.pathname, navigate]);

  const logout = useCallback(async () => {
    try {
      await postJson("/api/auth/logout", {});
    } catch {
      // best-effort
    }
    setUser(null);
    setIsAuthModalOpen(false);
    afterAuthNavigateToRef.current = null;
    navigate("/");
  }, [navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      isLoading,
      isAuthed,
      refreshMe,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      onOtpVerified,
      onGoogleLogin,
      logout,
    }),
    [user, role, isLoading, isAuthed, refreshMe, isAuthModalOpen, openAuthModal, closeAuthModal, onOtpVerified, onGoogleLogin, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

