import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";

/**
 * Handles the OAuth callback after Google (or any provider) redirects back.
 *
 * Supabase JS v2 uses PKCE by default — it returns a `?code=...` query param.
 * With `detectSessionInUrl: true` (the default), the Supabase client will
 * automatically call `exchangeCodeForSession` on initialization. We also do it
 * explicitly here as a belt-and-suspenders approach and to surface errors.
 *
 * The post-auth destination is read from localStorage (set by GoogleLoginButton
 * before the full-page redirect) so the user lands on the intended page.
 */
export function AuthCallback() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        if (!supabase) {
            setError("Auth is not configured.");
            return;
        }

        const url = new URL(window.location.href);
        const errorParam = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");

        // Surface any error that Google / Supabase returned.
        if (errorParam) {
            setError(errorDescription ?? errorParam);
            return;
        }

        const AUTH_REDIRECT_KEY = "hz_after_auth_navigate_to";

        function doNavigate() {
            let next = "/";
            try {
                const stored = window.localStorage.getItem(AUTH_REDIRECT_KEY);
                if (stored) {
                    window.localStorage.removeItem(AUTH_REDIRECT_KEY);
                    next = stored;
                }
            } catch {
                // ignore storage errors
            }
            navigate(next, { replace: true });
        }

        // Listen for Supabase to complete the code exchange and fire SIGNED_IN.
        // This covers both the automatic detectSessionInUrl exchange and our
        // explicit exchangeCodeForSession call below.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_IN") {
                subscription.unsubscribe();
                doNavigate();
            }
        });

        // Explicitly exchange the code as a reliable fallback (idempotent — if
        // detectSessionInUrl already did it, Supabase returns the existing session).
        const code = url.searchParams.get("code");
        if (code) {
            supabase.auth.exchangeCodeForSession(code).then(({ error: exchErr }) => {
                if (exchErr) {
                    subscription.unsubscribe();
                    // If code was already exchanged automatically, Supabase may return
                    // "code challenge does not match" — in that case the session is already
                    // set, so we just navigate.
                    if (exchErr.message?.toLowerCase().includes("already") ||
                        exchErr.message?.toLowerCase().includes("challenge")) {
                        doNavigate();
                    } else {
                        setError(exchErr.message);
                    }
                }
                // If no error, the SIGNED_IN event will fire and doNavigate is called there.
            });
        } else {
            // No code param — the session may already be available (implicit flow or
            // hash fragment). Check session and navigate if signed in.
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) {
                    subscription.unsubscribe();
                    doNavigate();
                } else {
                    subscription.unsubscribe();
                    setError("No authentication data found. Please try signing in again.");
                }
            });
        }

        return () => {
            subscription.unsubscribe();
        };
    }, [navigate]);

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md w-full text-center space-y-4">
                    <div className="text-4xl">⚠️</div>
                    <h1 className="text-xl font-bold text-gray-900">Sign-in failed</h1>
                    <p className="text-sm text-gray-600">{error}</p>
                    <button
                        onClick={() => navigate("/portal/login", { replace: true })}
                        className="mt-4 inline-block rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center space-y-3">
                <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                <p className="text-sm text-gray-500 font-medium">Completing sign-in…</p>
            </div>
        </div>
    );
}
