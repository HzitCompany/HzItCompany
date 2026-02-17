import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { clearSession, getSessionToken, getSessionRole, setSession } from "./session";
import { getJson } from "../services/apiClient";

export type MeUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  isVerified: boolean;
  provider: "otp" | "password";
  role: "client" | "admin";
};

type MeResponse = { ok: true; user: MeUser };

type AuthContextValue = {
  token: string | null;
  role: "client" | "admin" | null;
  user: MeUser | null;
  isLoading: boolean;
  isAuthed: boolean;

  isAuthModalOpen: boolean;
  openAuthModal: (opts?: { afterAuthNavigateTo?: string }) => void;
  closeAuthModal: () => void;
  onOtpVerified: (token: string) => Promise<void>;

  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState<string | null>(() => getSessionToken());
  const [role, setRole] = useState<AuthContextValue["role"]>(() => getSessionRole());
  const [user, setUser] = useState<MeUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const afterAuthNavigateToRef = useRef<string | null>(null);

  const isAuthed = !!token;

  const refreshMe = useCallback(
    async (activeToken: string) => {
      const me = await getJson<MeResponse>("/api/me", { token: activeToken });
      setUser(me.user);
      setRole(me.user.role);
    },
    []
  );

  useEffect(() => {
    const t = getSessionToken();
    if (!t) return;

    setIsLoading(true);
    refreshMe(t)
      .catch(() => {
        // Token could be invalid/expired/revoked.
        clearSession();
        setToken(null);
        setRole(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [refreshMe]);

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

  const onOtpVerified = useCallback(
    async (newToken: string) => {
      setSession(newToken, "client");
      setToken(newToken);
      setRole("client");
      await refreshMe(newToken);

      setIsAuthModalOpen(false);

      const target = afterAuthNavigateToRef.current;
      afterAuthNavigateToRef.current = null;
      if (target && target !== location.pathname) {
        navigate(target);
      }
    },
    [location.pathname, navigate, refreshMe]
  );

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setRole(null);
    setUser(null);
    setIsAuthModalOpen(false);
    afterAuthNavigateToRef.current = null;
    navigate("/");
  }, [navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      role,
      user,
      isLoading,
      isAuthed,

      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      onOtpVerified,

      logout,
    }),
    [token, role, user, isLoading, isAuthed, isAuthModalOpen, openAuthModal, closeAuthModal, onOtpVerified, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
