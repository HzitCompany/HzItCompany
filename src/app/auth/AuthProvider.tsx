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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _location = useLocation();

  const [user, setUser] = useState<MeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  const fetchProfile = useCallback(async (sessionUser: any): Promise<{ role: "user" | "admin"; full_name: string | null }> => {
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
  }, [fetchProfile, navigate, redirectPath, refreshMe]);

  const openAuthModal = useCallback((opts?: { afterAuthNavigateTo?: string }) => {
    if (opts?.afterAuthNavigateTo) {
      setRedirectPath(opts.afterAuthNavigateTo);
    }
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
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
