import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { supabase } from "../lib/supabase";
import { postJson } from "../services/apiClient";

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

  const fetchProfile = useCallback(async (sessionUser: any): Promise<{ role: "user" | "admin"; full_name: string | null }> => {
    if (!supabase) {
      return { role: "user", full_name: sessionUser?.user_metadata?.full_name ?? null };
    }
    // 1. Fetch from profiles table (DB role only)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", sessionUser.id)
      .single();
    
    // If profile doesn't exist, try sync
    if (!profile) {
       // Attempt to sync with backend to create profile if missing
       try {
         // This call requires backend to trust the token and create profile
         await postJson("/api/auth/sync-profile", {});
         return { role: "user", full_name: sessionUser.user_metadata?.full_name ?? null };
       } catch {
         return { role: "user", full_name: null };
       }
    }

    return { 
      role: (profile.role === "admin" ? "admin" : "user"), 
      full_name: profile.full_name 
    };
  }, []);

  const refreshMe = useCallback(async () => {
    if (!supabase) {
      setUser(null);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setUser(null);
      return;
    }

    const profile = await fetchProfile(session.user);
    
    setUser({
      id: session.user.id,
      email: session.user.email ?? null,
      full_name: profile.full_name ?? session.user.user_metadata?.full_name ?? null,
      role: profile.role
    });
  }, [fetchProfile]);

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    let mounted = true;

    // Initial load
    refreshMe().finally(() => {
      if (mounted) setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
         if (mounted) {
            // Optimistic update
            const profile = await fetchProfile(session.user);
            setUser({
              id: session.user.id,
              email: session.user.email ?? null,
              full_name: profile.full_name ?? session.user.user_metadata?.full_name ?? null,
              role: profile.role
            });

            if (event === "SIGNED_IN" && redirectPath) {
               navigate(redirectPath);
               setRedirectPath(null);
            try { window.localStorage.removeItem(AUTH_REDIRECT_KEY); } catch {}
            return;
            }

          if (event === "SIGNED_IN") {
            consumePostAuthRedirect();
          }
         }
      } else {
         if (mounted) setUser(null);
      }
      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // If we loaded a session on refreshMe (e.g. after OAuth redirect), apply redirect once.
    consumePostAuthRedirect();

  }, [consumePostAuthRedirect, fetchProfile, navigate, redirectPath, refreshMe]);

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
      await supabase.auth.signOut();
    }
    setUser(null);
    navigate("/");
  }, [navigate]);

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
