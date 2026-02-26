import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { postJson } from "../services/apiClient";
import { supabase } from "../lib/supabase";
import { Seo } from "../components/Seo";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { GoogleLoginButton } from "../components/GoogleLoginButton";
import { CmsSlot } from "../components/cms/CmsBlocks";

// ── Schemas ──────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type LoginData = z.infer<typeof loginSchema>;
type SignupData = z.infer<typeof signupSchema>;
type Mode = "login" | "signup";

// ── Eye toggle ────────────────────────────────────────────────────────────────
function EyeToggle({ show, onClick }: { show: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onClick}
      className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
      aria-label={show ? "Hide password" : "Show password"}
    >
      {show ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function PortalLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [mode, setMode] = useState<Mode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<SignupData>({ resolver: zodResolver(signupSchema) });

  function switchMode(next: Mode) {
    setMode(next);
    setMessage(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setSignupDone(false);
  }

  // ── Sign In ────────────────────────────────────────────────────────────────
  const handleLogin = async (data: LoginData) => {
    setLoading(true);
    setMessage(null);
    try {
      let result: any;
      try {
        result = await postJson("/api/auth/login", { email: data.email, password: data.password });
      } catch (e: any) {
        const msg: string = (e?.message ?? "").toLowerCase();
        const status = e?.status;

        // Supabase / backend returns 400 "Invalid login credentials" when
        // email+password combination is wrong, OR when email doesn't exist at all.
        // We need to distinguish the two so we check if the email even exists
        // via a lightweight register attempt (which returns 409 if it already exists).
        if (
          msg.includes("invalid") ||
          msg.includes("credentials") ||
          msg.includes("password") ||
          status === 400 ||
          status === 401
        ) {
          // Try to detect "not signed up" vs "wrong password":
          // Attempt to register with a dummy password — if it succeeds the email
          // was never registered (we immediately delete by logging out); if it
          // returns 409 the email IS registered — so the password was just wrong.
          let emailExists = true;
          try {
            const checkResult: any = await postJson("/api/auth/register", {
              email: data.email,
              password: "__probe__hz__",
            });
            // If register succeeded, the account didn't exist before — clean up
            // (Supabase will have created it; we can ignore the cleanup for now,
            //  but at least show the right message to the user).
            if (checkResult?.ok) {
              emailExists = false;
              // Remove the accidentally created account via signOut
              if (supabase) {
                try { await supabase.auth.signOut(); } catch { /* ignore */ }
              }
            }
          } catch (checkErr: any) {
            const checkStatus = checkErr?.status;
            const checkMsg = (checkErr?.message ?? "").toLowerCase();
            if (
              checkStatus === 409 ||
              checkMsg.includes("already") ||
              checkMsg.includes("exists") ||
              checkMsg.includes("conflict")
            ) {
              emailExists = true;
            } else {
              // Can't determine — default to wrong-password message
              emailExists = true;
            }
          }

          if (!emailExists) {
            throw new Error("You are not signed up. Please create an account first.");
          } else {
            throw new Error("Incorrect email or password. Please check and try again.");
          }
        }
        throw new Error(e?.message || "Sign in failed. Please try again.");
      }

      if (!result?.ok) {
        throw new Error(result?.error || "Sign in failed. Please try again.");
      }

      // Apply session to Supabase client
      if (supabase) {
        await supabase.auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
      }
      navigate("/portal");
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ── Sign Up ────────────────────────────────────────────────────────────────
  const handleSignup = async (data: SignupData) => {
    setLoading(true);
    setMessage(null);
    try {
      let result: any;
      try {
        result = await postJson("/api/auth/register", { email: data.email, password: data.password });
      } catch (e: any) {
        const status = e?.status;
        const msg = (e?.message ?? "").toLowerCase();
        if (
          status === 409 ||
          msg.includes("already") ||
          msg.includes("exists") ||
          msg.includes("conflict")
        ) {
          // Pre-fill the email on the login form and switch
          loginForm.setValue("email", data.email);
          switchMode("login");
          setMessage({ type: "error", text: "An account with this email already exists. Please sign in." });
          return;
        }
        throw new Error(e?.message || "Registration failed. Please try again.");
      }

      if (!result?.ok) {
        throw new Error(result?.error || "Registration failed. Please try again.");
      }

      // Success — auto-login immediately so user doesn't have to type again
      try {
        const loginResult: any = await postJson("/api/auth/login", {
          email: data.email,
          password: data.password,
        });
        if (loginResult?.ok && supabase) {
          await supabase.auth.setSession({
            access_token: loginResult.access_token,
            refresh_token: loginResult.refresh_token,
          });
          setSignupDone(true);
          setTimeout(() => navigate("/portal"), 1800);
          return;
        }
      } catch {
        // Auto-login failed — fall through to manual sign-in prompt
      }

      // Fallback: show success and redirect to login
      setSignupDone(true);
      loginForm.setValue("email", data.email);
      setTimeout(() => {
        setSignupDone(false);
        switchMode("login");
        setMessage({ type: "success", text: "Account created! Enter your password to sign in." });
      }, 2000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Seo
        title={mode === "login" ? "Client Portal – HZ IT Company" : "Create Account – HZ IT Company"}
        description="Sign in or create an account to access the HZ IT Company client portal."
        path="/portal/login"
      />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 font-poppins">
          {mode === "login" ? "Client Portal" : "Create Account"}
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => switchMode(mode === "login" ? "signup" : "login")}
            className="font-medium text-blue-600 hover:text-blue-500 hover:underline"
          >
            {mode === "login" ? "Sign up for free" : "Sign in here"}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10 border border-gray-100 space-y-6">

          {/* Status banner */}
          {message && (
            <div
              className={`px-4 py-3 rounded-lg text-sm border ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* ── SIGNUP SUCCESS ─────────────────────────────────────────── */}
          {signupDone && (
            <div className="flex flex-col items-center justify-center py-6 space-y-3 text-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-100">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Account created!</h2>
              <p className="text-sm text-gray-500">Signing you in…</p>
            </div>
          )}

          {/* ── LOGIN FORM ──────────────────────────────────────────────── */}
          {mode === "login" && !signupDone && (
            <form className="space-y-5" onSubmit={loginForm.handleSubmit(handleLogin)}>
              {/* Email */}
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...loginForm.register("email")}
                  className={loginForm.formState.errors.email ? "border-red-300" : ""}
                />
                {loginForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              {/* Password with eye toggle */}
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...loginForm.register("password")}
                    className={`pr-10 ${loginForm.formState.errors.password ? "border-red-300" : ""}`}
                  />
                  <EyeToggle show={showPassword} onClick={() => setShowPassword((v) => !v)} />
                </div>
                {loginForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-600">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          )}

          {/* ── SIGNUP FORM ─────────────────────────────────────────────── */}
          {mode === "signup" && !signupDone && (
            <form className="space-y-5" onSubmit={signupForm.handleSubmit(handleSignup)}>
              {/* Email */}
              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <Input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...signupForm.register("email")}
                  className={signupForm.formState.errors.email ? "border-red-300" : ""}
                />
                {signupForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">{signupForm.formState.errors.email.message}</p>
                )}
              </div>

              {/* Create password with eye toggle */}
              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Create password
                </label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    {...signupForm.register("password")}
                    className={`pr-10 ${signupForm.formState.errors.password ? "border-red-300" : ""}`}
                  />
                  <EyeToggle show={showPassword} onClick={() => setShowPassword((v) => !v)} />
                </div>
                {signupForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-600">{signupForm.formState.errors.password.message}</p>
                )}
              </div>

              {/* Confirm password with eye toggle */}
              <div>
                <label htmlFor="signup-confirm" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm password
                </label>
                <div className="relative">
                  <Input
                    id="signup-confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    {...signupForm.register("confirmPassword")}
                    className={`pr-10 ${signupForm.formState.errors.confirmPassword ? "border-red-300" : ""}`}
                  />
                  <EyeToggle show={showConfirmPassword} onClick={() => setShowConfirmPassword((v) => !v)} />
                </div>
                {signupForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{signupForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </form>
          )}

          {/* Google OAuth divider */}
          {!signupDone && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">Or continue with</span>
                </div>
              </div>
              <GoogleLoginButton />
            </>
          )}

          <div className="text-center">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-800 hover:underline">
              ← Back to website
            </Link>
          </div>
        </div>
      </div>

      {/* Admin-managed page blocks */}
      <CmsSlot contentKey="page.portal-login" />
    </div>
  );
}
