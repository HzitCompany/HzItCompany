import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { motion } from "framer-motion";
import { Seo } from "../components/Seo";
import { login, loginWithSupabase } from "../services/platformService";
import { setSession } from "../auth/session";
import { supabase } from "../lib/supabase";

function getErrorMessage(err: unknown) {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const anyErr = err as any;
    if (typeof anyErr.message === "string" && anyErr.message.trim()) return anyErr.message;
  }
  return "Login failed";
}

export function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("hzitcompany@gmail.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) return;

        setLoading(true);
        setError(null);

        const r = await loginWithSupabase(accessToken);

        if (cancelled) return;
        setSession(r.token, r.role);

        // App uses its own JWT; clear Supabase session to avoid loops.
        await supabase.auth.signOut();

        navigate(r.role === "admin" ? "/admin" : "/portal");
      } catch (e: unknown) {
        if (cancelled) return;
        // If OAuth completion fails, fall back to password login.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function onGoogle() {
    if (loading) return;
    setError(null);

    const redirectTo = `${window.location.origin}/admin/login`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });

    if (error) setError(error.message || "Google login failed");
  }

  async function onSubmit() {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail || !password) {
        setError("Enter your email and password.");
        return;
      }

      const r = await login({ email: trimmedEmail, password });

      const role = (r as any)?.role;
      const token = (r as any)?.token;

      if (role !== "admin") {
        setError("This account is not an admin.");
        return;
      }

      if (typeof token !== "string" || token.length < 10) {
        setError("Unexpected login response. Please try again.");
        return;
      }

      setSession(token, "admin");
      navigate("/admin");
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Seo title="Admin Login" description="Admin access for HZ IT Company." path="/admin/login" />

      <section className="relative pt-32 pb-16 bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 font-poppins">Admin</h1>
            <p className="text-lg text-gray-300">Manage orders, pricing, and leads.</p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/40 p-6 sm:p-10 shadow-xl">
              <h2 className="text-3xl font-bold text-gray-900 font-poppins">Admin Login</h2>
              <p className="mt-2 text-gray-600">Enter your credentials to continue.</p>

              <div className="mt-6 grid gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Email</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    inputMode="email"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Password</span>
                  <input
                    type="password"
                    className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </label>

                {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900 text-sm">{error}</div> : null}

                <button
                  type="button"
                  disabled={loading}
                  onClick={onSubmit}
                  className="min-h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {loading ? "Please wait…" : "Login"}
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={onGoogle}
                  className="min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Continue with Google
                </button>

                <Link to="/" className="text-center text-sm text-gray-600 hover:underline">
                  Back to website
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
