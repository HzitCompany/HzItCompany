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

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AuthFormData = z.infer<typeof authSchema>;

export function Auth() {
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
