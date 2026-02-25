import { useState } from "react";
import { supabase } from "../lib/supabase";

export type GoogleLoginButtonProps = {
  onSuccess?: () => void;
  onError?: () => void;
};

export function GoogleLoginButton(props: GoogleLoginButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    if (!supabase) {
      console.error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      props.onError?.();
      return;
    }

    // Persist intended post-auth destination across OAuth full-page redirect.
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const nextParam = urlParams.get("next");
      const path = nextParam
        ? nextParam // Use the explicit ?next= param if present
        : `${window.location.pathname}${window.location.search}`;
      const next = path === "/admin/login" ? "/admin" : path === "/portal/login" ? "/portal" : path;
      window.localStorage.setItem("hz_after_auth_navigate_to", next);
    } catch {
      // ignore
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) {
        throw error;
      };
      props.onSuccess?.();
    } catch (error) {
      console.error("Google login error:", error);
      props.onError?.();
    } finally {
      if (!window.location.href.includes("accounts.google.com")) {
          setLoading(false);
      }
    }
  }

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all hover:bg-gray-50 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed font-medium"
      type="button"
    >
      <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5" />
      <span>{loading ? "Redirecting..." : "Continue with Google"}</span>
    </button>
  );
}
