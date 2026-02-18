import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "../lib/supabase";
import { Seo } from "../components/Seo";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { GoogleLoginButton } from "../components/GoogleLoginButton";

const adminLoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type AdminLoginData = z.infer<typeof adminLoginSchema>;

export function AdminLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginData>({
    resolver: zodResolver(adminLoginSchema),
  });

  const onSubmit = async (data: AdminLoginData) => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) {
        throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) throw signInError;
      
      // Navigate to admin dash. Middleware will check role.
      navigate("/admin");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Seo title="Admin Login" description="Restricted access" path="/admin/login" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="text-center">
            <div className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-700 to-blue-900 px-6 py-2 text-white shadow-sm">
              <h2 className="text-2xl font-bold tracking-tight font-poppins">Admin Portal</h2>
            </div>
            <p className="mt-3 text-sm text-gray-600">Secure access for HZ administrators</p>
        </div>

        <div className="mt-8 bg-white py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-gray-200">
          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-800">
                Email address
              </label>
              <div className="mt-1">
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  className={errors.email ? "border-red-300" : ""}
                />
                {errors.email && <p className="mt-1 text-sm text-rose-700">{errors.email.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-800">
                Password
              </label>
              <div className="mt-1">
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register("password")}
                  className={errors.password ? "border-red-300" : ""}
                />
                {errors.password && <p className="mt-1 text-sm text-rose-700">{errors.password.message}</p>}
              </div>
            </div>

            <div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Verifying..." : "Sign in"}
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
               <GoogleLoginButton />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
