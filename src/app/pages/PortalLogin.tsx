import { useState } from "react";
import { useNavigate, Link } from "react-router";

import { Seo } from "../components/Seo";
import { login, registerClient } from "../services/platformService";
import { GoogleLoginButton } from "../components/GoogleLoginButton";
import { useAuth } from "../auth/AuthProvider";

export function PortalLogin() {
  const navigate = useNavigate();
  const { onGoogleLogin, refreshMe } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      if (mode === "register") {
        await registerClient({ name: name.trim(), email: email.trim(), password });
      } else {
        await login({ email: email.trim(), password });
      }
      // Refresh auth context from cookie session
      await refreshMe();
      navigate("/portal");
    } catch (e: any) {
      setError(e?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Seo title="Client Portal" description="Login to view orders and download invoices." path="/portal/login" />

      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-10">
          <h1 className="text-3xl font-bold text-gray-900 font-poppins">
            {mode === "login" ? "Login" : "Create account"}
          </h1>
          <p className="mt-2 text-gray-600">Access your orders and invoices.</p>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${mode === "login" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300"}`}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${mode === "register" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300"}`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>

          <div className="mt-6 grid gap-4">
            {mode === "register" ? (
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Name</span>
                <input className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
            ) : null}

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input type="email" autoComplete="email" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div> : null}

            <button
              type="button"
              disabled={loading}
              onClick={onSubmit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Please waitâ€¦" : mode === "login" ? "Login" : "Create account"}
            </button>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 uppercase tracking-wide">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="flex justify-center">
              <GoogleLoginButton
                width={280}
                onSuccess={() => navigate("/portal")}
                onError={(msg) => setError(msg)}
              />
            </div>

            <Link to="/auth" className="text-center text-sm text-blue-700 hover:underline">
              Login with OTP (passwordless)
            </Link>

            <Link to="/" className="text-center text-sm text-gray-600 hover:underline">
              Back to website
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

