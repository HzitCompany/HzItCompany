import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";
import { GoogleLoginButton } from "./GoogleLoginButton";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const authSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  })
  .strict();

type AuthFormData = z.infer<typeof authSchema>;

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  useEffect(() => {
    if (!isAuthModalOpen) return;
    setError(null);
    reset();
  }, [isAuthModalOpen, isLogin, reset]);

  const onSubmit = async (data: AuthFormData) => {
    setLoading(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      }
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (signInError) throw signInError;
        closeAuthModal();
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (signUpError) throw signUpError;
      setError("Check your email for the confirmation link.");
    } catch (err: any) {
      setError(err?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthModal}
        >
          <motion.div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isLogin ? "Welcome back" : "Create account"}
                </h2>
                <button
                  onClick={closeAuthModal}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                  type="button"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {error && (
                <div
                  className={`mb-4 rounded-lg p-3 text-sm ${
                    error.includes("Check your email")
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      {...register("email")}
                      className={errors.email ? "border-red-300 focus-visible:ring-red-500" : ""}
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      {...register("password")}
                      className={errors.password ? "border-red-300 focus-visible:ring-red-500" : ""}
                    />
                    {errors.password && (
                      <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                    )}
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">Or continue with</span>
                </div>
              </div>

              <GoogleLoginButton />

              <div className="mt-6 text-center text-sm text-gray-600">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => setIsLogin((v) => !v)}
                  className="font-medium text-blue-600 hover:text-blue-500 hover:underline"
                  type="button"
                >
                  {isLogin ? "Sign up" : "Log in"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
