import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Seo } from "../components/Seo";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
});

type ProfileData = z.infer<typeof profileSchema>;

export function Profile() {
  const { user, logout, refreshMe } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, phone, avatar_url")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (data) {
          setValue("full_name", data.full_name || "");
          setValue("phone", data.phone || "");
          setAvatarUrl(data.avatar_url);
        }
      } catch (err: any) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user, setValue]);

  const onSubmit = async (data: ProfileData) => {
    if (!user) return;
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          phone: data.phone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
      
      await refreshMe(); // Update global auth state
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  };

  const activeAvatar = avatarUrl || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Seo title="My Profile" description="Manage your account" path="/profile" />

      {/* Header */}
      <section className="relative pt-32 pb-16 bg-blue-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-6"
          >
            <div className="relative">
                <img 
                    src={activeAvatar} 
                    alt="Profile" 
                    className="h-24 w-24 rounded-full border-4 border-white/20 bg-white"
                />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-poppins">{user?.full_name || "User"}</h1>
              <p className="text-blue-200">{user?.email}</p>
              <div className="mt-2 text-xs font-mono bg-blue-800/50 inline-block px-2 py-1 rounded">
                Role: {user?.role}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 sm:p-8">
          
          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading profile...</div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
              {message && (
                <div className={`p-4 rounded-md ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  {message.text}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <div className="mt-1">
                    <Input
                      {...register("full_name")}
                      className={errors.full_name ? "border-red-300" : ""}
                    />
                    {errors.full_name && <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <div className="mt-1">
                    <Input
                      {...register("phone")}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700">Email (Read Only)</label>
                   <div className="mt-1">
                     <Input disabled value={user?.email || ""} className="bg-gray-50 text-gray-500" />
                   </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving Changes..." : "Save Changes"}
                </Button>
                
                <button
                  type="button"
                  onClick={() => logout()}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
