import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "../lib/supabase";
import { postJson } from "../services/apiClient";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { GoogleLoginButton } from "../components/GoogleLoginButton";
import { Seo } from "../components/Seo";
import { CmsSlot } from "../components/cms/CmsBlocks";

// ── Schemas ─────────────────────────────────────────────────────────────────
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

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type LoginData = z.infer<typeof loginSchema>;
type SignupData = z.infer<typeof signupSchema>;
type ForgotData = z.infer<typeof forgotSchema>;
type Mode = "login" | "signup" | "forgot";

// ── Eye toggle button ────────────────────────────────────────────────────────
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

// ── Main component ────────────────────────────────────────────────────────
export function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get("next") || "/portal/dashboard";
  const { isAuthed, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthed) {
      navigate(nextUrl, { replace: true });
    }
  }, [isLoading, isAuthed, navigate, nextUrl]);

  const [mode, setMode] = useState<Mode>("login");
  const [pageLoading, setPageLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<SignupData>({ resolver: zodResolver(signupSchema) });
  const forgotForm = useForm<ForgotData>({ resolver: zodResolver(forgotSchema) });

  function switchMode(next: Mode) {
    setMode(next);
    setMessage(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  async function withTimeout<T>(promise: Promise<T>, ms = 12000): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("The authentication service is not responding. Please try again in a few minutes.")),
        ms
      );
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer!));
  }

  function normaliseError(err: any): Error {
    const msg: string = err?.message ?? "";
    if (
      msg.toLowerCase().includes("failed to fetch") ||
      msg.toLowerCase().includes("network request failed") ||
      msg.toLowerCase().includes("networkerror")
    ) {
      return new Error("Cannot reach the authentication service. Please check your connection and try again.");
    }
    return err instanceof Error ? err : new Error(msg || "An unexpected error occurred.");
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (data: LoginData) => {
    setPageLoading(true);
    setMessage(null);
    try {
      if (!supabase) throw new Error("Authentication is not configured. Please contact support.");
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email: data.email, password: data.password })
      ).catch((e) => { throw normaliseError(e); });

      if (error) {
        const m = error.message?.toLowerCase() ?? "";
        if (m.includes("invalid login credentials") || m.includes("invalid credentials") || m.includes("user not found")) {
          throw new Error("No account was found with these credentials. Please check your email and password, or create a new account.");
        }
        throw normaliseError(error);
      }
      navigate(nextUrl, { replace: true });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setPageLoading(false);
    }
  };

  // ── Sign Up (with cold-start retry) ───────────────────────────────────────
  const handleSignup = async (data: SignupData) => {
    setPageLoading(true);
    setMessage(null);
    try {
      if (!supabase) throw new Error("Authentication is not configured. Please contact support.");

      let registered = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await withTimeout(postJson("/api/auth/register", { email: data.email, password: data.password }));
          registered = true;
          break;
        } catch (regErr: any) {
          const regMsg = (regErr?.message ?? "").toLowerCase();
          if (
            regMsg.includes("already registered") ||
            regMsg.includes("already exists") ||
            regMsg.includes("conflict") ||
            regErr?.status === 409
          ) {
            registered = true; // account exists — just sign in below
            break;
          }
          // Retry on any network-level failure (cold start / ERR_CONNECTION_CLOSED /
          // ERR_CONNECTION_TIMED_OUT / 503 starting) — up to 3 attempts.
          const isNetworkError =
            regMsg.includes("failed to fetch") ||
            regMsg.includes("network request failed") ||
            regMsg.includes("networkerror") ||
            regMsg.includes("connection closed") ||
            regMsg.includes("connection reset") ||
            regMsg.includes("starting") ||
            regErr?.status === 503 ||
            regErr?.status == null; // no HTTP status = network-level failure

          if (isNetworkError && attempt < 2) {
            setMessage({ type: "success", text: `Server is warming up, retrying… (attempt ${attempt + 2}/3)` });
            await new Promise((r) => setTimeout(r, 3500));
            continue;
          }
          throw normaliseError(regErr);
        }
      }

      if (!registered) throw new Error("Could not reach the server. Please try again.");
      setMessage(null);

      const { error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword({ email: data.email, password: data.password })
      ).catch((e) => { throw normaliseError(e); });

      if (signInError) throw normaliseError(signInError);
      navigate(nextUrl, { replace: true });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setPageLoading(false);
    }
  };

  // ── Forgot password ────────────────────────────────────────────────────────
  const handleForgot = async (data: ForgotData) => {
    setPageLoading(true);
    setMessage(null);
    try {
      if (!supabase) throw new Error("Authentication is not configured. Please contact support.");
      const { error } = await withTimeout(
        supabase.auth.resetPasswordForEmail(data.email, {
          redirectTo: window.location.origin + "/auth",
        })
      ).catch((e) => { throw normaliseError(e); });
      if (error) throw normaliseError(error);
      setMessage({ type: "success", text: "Password reset link sent! Check your inbox (and spam folder)." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setPageLoading(false);
    }
  };

  const titles: Record<Mode, string> = {
    login: "Sign in to your account",
    signup: "Create a new account",
    forgot: "Forgot your password?",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Seo
        title={mode === "login" ? "Sign In — HZ Company" : mode === "signup" ? "Sign Up — HZ Company" : "Reset Password — HZ Company"}
        description="Sign in or create an account to submit hire and career requests."
      />

      <div className="flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">

          {/* ── Page heading (always clearly visible) ────────────── */}
          <div className="text-center">
            <h1 className="text-3xl font-bold" style={{ color: "#111827" }}>
              {titles[mode]}
            </h1>

            {mode === "login" && (
              <p className="mt-2 text-sm text-gray-600">
                Don&apos;t have an account?{" "}
                <button type="button" onClick={() => switchMode("signup")} className="font-medium text-blue-600 hover:underline">
                  Sign up for free
                </button>
              </p>
            )}
            {mode === "signup" && (
              <p className="mt-2 text-sm text-gray-600">
                Already have an account?{" "}
                <button type="button" onClick={() => switchMode("login")} className="font-medium text-blue-600 hover:underline">
                  Sign in here
                </button>
              </p>
            )}
            {mode === "forgot" && (
              <p className="mt-2 text-sm text-gray-600">
                Remembered your password?{" "}
                <button type="button" onClick={() => switchMode("login")} className="font-medium text-blue-600 hover:underline">
                  Back to sign in
                </button>
              </p>
            )}
          </div>

          {/* ── Card ─────────────────────────────────────────────── */}
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 space-y-6">

            {/* Status / error banner */}
            {message && (
              <div
                className={`p-4 rounded-md text-sm border ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            {/* ── LOGIN FORM ─────────────────────────────────────── */}
            {mode === "login" && (
              <form className="space-y-5" onSubmit={loginForm.handleSubmit(handleLogin)}>
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

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
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

                <Button
                  type="submit"
                  disabled={pageLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2"
                >
                  {pageLoading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            )}

            {/* ── SIGNUP FORM ────────────────────────────────────── */}
            {mode === "signup" && (
              <form className="space-y-5" onSubmit={signupForm.handleSubmit(handleSignup)}>
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

                <Button
                  type="submit"
                  disabled={pageLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2"
                >
                  {pageLoading ? "Creating account…" : "Sign up"}
                </Button>
              </form>
            )}

            {/* ── FORGOT PASSWORD FORM ───────────────────────────── */}
            {mode === "forgot" && (
              <form className="space-y-5" onSubmit={forgotForm.handleSubmit(handleForgot)}>
                <p className="text-sm text-gray-600">
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </p>
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email address
                  </label>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...forgotForm.register("email")}
                    className={forgotForm.formState.errors.email ? "border-red-300" : ""}
                  />
                  {forgotForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-red-600">{forgotForm.formState.errors.email.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={pageLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2"
                >
                  {pageLoading ? "Sending…" : "Send reset link"}
                </Button>
              </form>
            )}

            {/* Google OAuth — login and signup only */}
            {mode !== "forgot" && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-gray-500">Or continue with</span>
                  </div>
                </div>
                <GoogleLoginButton />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Admin-managed page blocks */}
      <CmsSlot contentKey="page.auth" />
    </div>
  );
}

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get("next") || "/portal/dashboard";
  const { isAuthed, isLoading } = useAuth();

  // If already signed in, redirect to the intended destination
  useEffect(() => {
    if (!isLoading && isAuthed) {
      navigate(nextUrl, { replace: true });
    }
  }, [isLoading, isAuthed, navigate, nextUrl]);

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  /**
   * Wraps a promise with a timeout. Throws a user-friendly error if the promise
   * doesn't resolve within `ms` milliseconds (e.g. Supabase project is paused).
   */
  async function withTimeout<T>(promise: Promise<T>, ms = 12000): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(
              "The authentication service is not responding. It may be temporarily unavailable — please try again in a few minutes."
            )
          ),
        ms
      );
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer!));
  }

  const onSubmit = async (data: AuthFormData) => {
    setLoading(true);
    setMessage(null);

    try {
      if (!supabase) {
        throw new Error("Authentication is not configured. Please contact support.");
      }

      /** Normalise common network-level fetch failures into a readable message. */
      function normaliseError(err: any): Error {
        const msg: string = err?.message ?? "";
        if (
          msg.toLowerCase().includes("failed to fetch") ||
          msg.toLowerCase().includes("network request failed") ||
          msg.toLowerCase().includes("networkerror")
        ) {
          return new Error(
            "Cannot reach the authentication service. Please check your internet connection or try again later."
          );
        }
        return err instanceof Error ? err : new Error(msg || "An unexpected error occurred.");
      }

      if (isLogin) {
        const { error: signInError } = await withTimeout(
          supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
          })
        ).catch((e) => { throw normaliseError(e); });

        if (signInError) {
          const msg = signInError.message?.toLowerCase() ?? "";
          if (
            msg.includes("invalid login credentials") ||
            msg.includes("invalid credentials") ||
            msg.includes("user not found") ||
            msg.includes("no user found")
          ) {
            throw new Error(
              "No account was found with these credentials. Please check your email and password, or sign up for a new account."
            );
          }
          throw normaliseError(signInError);
        }
        navigate(nextUrl, { replace: true });
      } else {
        // Use server-side registration with auto email-confirm so users
        // can log in immediately without waiting for a Supabase verification email.
        try {
          await withTimeout(
            postJson("/api/auth/register", {
              email: data.email,
              password: data.password,
            })
          ).catch((e) => { throw normaliseError(e); });
        } catch (regErr: any) {
          const regMsg = regErr?.message?.toLowerCase() ?? "";
          if (regMsg.includes("already registered") || regMsg.includes("already exists") || regMsg.includes("conflict") || regErr?.status === 409) {
            // Account already exists — fall through and attempt sign-in
          } else {
            throw regErr;
          }
        }

        // Sign in immediately (account is already confirmed)
        const { error: signInError } = await withTimeout(
          supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
          })
        ).catch((e) => { throw normaliseError(e); });

        if (signInError) {
          throw normaliseError(signInError);
        }
        navigate(nextUrl, { replace: true });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An error occurred during authentication" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Seo
        title={isLogin ? "Sign In - HZ Company" : "Sign Up - HZ Company"}
        description="Sign in or create an account to submit hire and career requests."
      />
      <div className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            {isLogin ? "Sign in to your account" : "Create a new account"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? "Or " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setMessage(null);
              }}
              className="font-medium text-blue-600 hover:text-blue-500 hover:underline"
            >
              {isLogin ? "create a new account" : "sign in here"}
            </button>
          </p>
        </div>

        <div className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            {message && (
              <div className={`p-4 rounded-md text-sm ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {message.text}
              </div>
            )}
            
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...register("email")}
                    className={errors.email ? "border-red-300 focus-visible:ring-red-500" : ""}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1">
                  <Input
                    id="password"
                    type="password"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    placeholder="••••••••"
                    {...register("password")}
                    className={errors.password ? "border-red-300 focus-visible:ring-red-500" : ""}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? "Processing..." : isLogin ? "Sign in" : "Sign up"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">Or continue with</span>
            </div>
          </div>

          <GoogleLoginButton />
        </div>
        </div>
      </div>

      {/* Admin-managed page blocks */}
      <CmsSlot contentKey="page.auth" />
    </div>
  );
}
