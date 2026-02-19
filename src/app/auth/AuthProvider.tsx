import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { supabase } from "../lib/supabase";
import { getJson, setApiAuthToken } from "../services/apiClient";

export type MeUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "user" | "admin";
};

type AuthContextValue = {
  user: MeUser | null;
  role: "user" | "admin" | null;
  isLoading: boolean;
  isAuthed: boolean;

  refreshMe: () => Promise<void>;

  isAuthModalOpen: boolean;
  openAuthModal: (opts?: { afterAuthNavigateTo?: string }) => void;
  closeAuthModal: () => void;
  
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const AUTH_REDIRECT_KEY = "hz_after_auth_navigate_to";

  const consumePostAuthRedirect = useCallback(() => {
    try {
      const next = window.localStorage.getItem(AUTH_REDIRECT_KEY);
      if (!next) return;
      window.localStorage.removeItem(AUTH_REDIRECT_KEY);
      // Avoid no-op navigation loops.
      const current = `${location.pathname}${location.search}`;
      if (next !== current) navigate(next);
    } catch {
      // Ignore storage errors (private mode, blocked storage, etc.)
    }
  }, [location.pathname, location.search, navigate]);

  const [user, setUser] = useState<MeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  // -- Role cache helpers (localStorage) so we never need to hit /api/me on every reload --
  const ROLE_CACHE_KEY = "hz_user_role_cache";

  const getCachedRole = useCallback((userId: string): "user" | "admin" | null => {
    try {
      const raw = window.localStorage.getItem(ROLE_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.userId === userId) return parsed.role ?? "user";
    } catch {}
    return null;
  }, []);

  const setCachedRole = useCallback((userId: string, role: "user" | "admin") => {
    try {
      window.localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify({ userId, role }));
    } catch {}
  }, []);

  const clearCachedRole = useCallback(() => {
    try { window.localStorage.removeItem(ROLE_CACHE_KEY); } catch {}
  }, []);

  // Tracks whether we've already sent a fresh /api/me call for the current session.
  const roleFetchedForSession = useCallback(
    (() => {
      let lastFetchedUserId: string | null = null;
      let inFlight: Promise<"user" | "admin"> | null = null;
      return async (userId: string): Promise<"user" | "admin"> => {
        // Deduplicate: if we already have an in-flight request, reuse it.
        if (lastFetchedUserId === userId && inFlight) return inFlight;
        lastFetchedUserId = userId;
        inFlight = (async () => {
          try {
            const res = await getJson<{ ok: true; user: { role?: "admin" | "user" } }>("/api/me");
            const role = res.user?.role === "admin" ? "admin" : "user";
            setCachedRole(userId, role);
            return role;
          } catch {
            // Backend unavailable (503/network) — use cache or default to "user"
            return getCachedRole(userId) ?? "user";
          } finally {
            inFlight = null;
          }
        })();
        return inFlight;
      };
    })(),
    [getCachedRole, setCachedRole]
  );

  const buildUser = useCallback(async (sessionUser: any, freshFetch: boolean): Promise<MeUser> => {
    const cached = getCachedRole(sessionUser.id);
    // Use cache immediately for instant load; fetch fresh in background only on new sign-in.
    const role = cached && !freshFetch
      ? cached
      : await roleFetchedForSession(sessionUser.id);

    return {
      id: sessionUser.id,
      email: sessionUser.email ?? null,
      full_name: sessionUser.user_metadata?.full_name ?? null,
      role,
    };
  }, [getCachedRole, roleFetchedForSession]);

  const refreshMe = useCallback(async () => {
    if (!supabase) { setUser(null); return; }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setUser(null); return; }
      setApiAuthToken(session.access_token ?? null);
      const me = await buildUser(session.user, false);
      setUser(me);
    } catch {
      // Ignore lock-manager/session restore errors.
      // Existing auth state (or stored-token restore) remains in effect.
    }
  }, [buildUser]);

  const restoreFromStoredToken = useCallback(async () => {
    // Best-effort restore for browsers that fail Supabase lock acquisition on reload.
    try {
      const supabaseUrl = (supabase as any)?.supabaseUrl as string | undefined;
      if (!supabaseUrl) return false;

      const host = new URL(supabaseUrl).host;
      const ref = host.split(".")[0];
      if (!ref) return false;

      const tokenKey = `sb-${ref}-auth-token`;
      if (!tokenKey) return false;

      const raw = window.localStorage.getItem(tokenKey);
      if (!raw) return false;

      const parsed = JSON.parse(raw);
      const token =
        (parsed?.currentSession?.access_token as string | undefined) ??
        (parsed?.access_token as string | undefined) ??
        null;
      if (!token) return false;

      setApiAuthToken(token);

      // Decode JWT payload without verification (UI restore only).
      const parts = token.split(".");
      if (parts.length < 2) return false;
      const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = JSON.parse(decodeURIComponent(escape(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")))));

      const id = typeof json?.sub === "string" ? json.sub : null;
      const email = typeof json?.email === "string" ? json.email : null;
      if (!id) return false;

      const role = getCachedRole(id) ?? "user";
      setUser({ id, email, full_name: null, role });
      return true;
    } catch {
      return false;
    }
  }, [getCachedRole]);

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    let mounted = true;
    const loadingFallbackTimer = window.setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 2500);

    // If Supabase fails to restore session due to LockManager issues,
    // restore from stored token so refresh doesn't force a re-login.
    restoreFromStoredToken()
      .then((restored) => {
        if (mounted && restored) setIsLoading(false);
      })
      .finally(() => undefined);

    // CORRECT Supabase v2 pattern: do NOT call getSession() on mount.
    // onAuthStateChange always fires INITIAL_SESSION synchronously with the
    // stored localStorage session — this is the only reliable way to restore
    // a session on reload without forcing the user to re-login.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      void (async () => {
        if (!mounted) return;

        try {
          // Keep apiClient in sync with latest token.
          setApiAuthToken(session?.access_token ?? null);

          if (session?.user) {
            // freshFetch only on real sign-in; INITIAL_SESSION + TOKEN_REFRESHED use cache.
            const freshFetch = event === "SIGNED_IN" || event === "USER_UPDATED";
            const me = await buildUser(session.user, freshFetch);
            if (mounted) setUser(me);

            if (event === "SIGNED_IN") {
              if (redirectPath) {
                navigate(redirectPath);
                setRedirectPath(null);
                try { window.localStorage.removeItem(AUTH_REDIRECT_KEY); } catch {}
              } else {
                consumePostAuthRedirect();
              }
            }
          } else {
            // Only clear if it's an explicit sign-out, not just a transient null session.
            if (event === "SIGNED_OUT") {
              clearCachedRole();
              if (mounted) setUser(null);
            }
          }
        } catch {
          // Swallow auth restoration race errors (LockManager timeout etc.)
          // to avoid unhandled promise rejections that break guarded pages.
        } finally {
          if (mounted) setIsLoading(false);
        }
      })();
    });

    return () => {
      mounted = false;
      window.clearTimeout(loadingFallbackTimer);
      subscription.unsubscribe();
    };
  }, [buildUser, clearCachedRole, consumePostAuthRedirect, navigate, redirectPath]);

  const openAuthModal = useCallback((opts?: { afterAuthNavigateTo?: string }) => {
    if (opts?.afterAuthNavigateTo) {
      setRedirectPath(opts.afterAuthNavigateTo);
      try {
        window.localStorage.setItem(AUTH_REDIRECT_KEY, opts.afterAuthNavigateTo);
      } catch {
        // ignore
      }
    }
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const logout = useCallback(async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Keep local logout working even if auth storage lock/session API fails.
      }
    }
    setApiAuthToken(null);
    clearCachedRole();
    setUser(null);
    navigate("/");
  }, [clearCachedRole, navigate]);

  const value = useMemo(() => ({
    user,
    role: user?.role ?? null,
    isLoading,
    isAuthed: !!user,
    refreshMe,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
    logout
  }), [user, isLoading, refreshMe, isAuthModalOpen, openAuthModal, closeAuthModal, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
