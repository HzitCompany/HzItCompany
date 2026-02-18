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
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Seo title="Admin Login" description="Restricted access" path="/admin/login" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-white font-poppins">Admin Portal</h2>
            <p className="mt-2 text-sm text-white/70">Secure access for HZ administrators</p>
        </div>

        <div className="mt-8 bg-white/5 backdrop-blur-lg py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-white/10">
          {error && (
            <div className="mb-4 bg-rose-500/10 border border-rose-200/20 text-rose-100 px-4 py-3 rounded-xl relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/80">
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
                {errors.email && <p className="mt-1 text-sm text-rose-200">{errors.email.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/80">
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
                {errors.password && <p className="mt-1 text-sm text-rose-200">{errors.password.message}</p>}
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
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-neutral-950 px-2 text-white/60">Or continue with</span>
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
