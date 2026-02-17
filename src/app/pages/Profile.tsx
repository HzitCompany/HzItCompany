import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Seo } from "../components/Seo";
import { useAuth } from "../auth/AuthProvider";

export function Profile() {
  const { user, logout, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const initial = useMemo(
    () => ({
      name: user?.name ?? "",
      email: user?.email ?? ""
    }),
    [user?.email, user?.name]
  );

  const [draftName, setDraftName] = useState(initial.name);
  const [draftEmail, setDraftEmail] = useState(initial.email);

  useEffect(() => {
    if (isEditing) return;
    setDraftName(initial.name);
    setDraftEmail(initial.email);
  }, [initial.email, initial.name, isEditing]);

  async function onSave() {
    setNotice(null);
    setSaving(true);
    try {
      await updateProfile({
        name: draftName.trim() || undefined,
        email: draftEmail.trim() || undefined
      });
      setIsEditing(false);
      setNotice({ kind: "success", message: "Profile updated." });
    } catch (e: any) {
      setNotice({ kind: "error", message: e?.message ?? "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Seo title="My Profile" description="Your profile details." path="/profile" />

      {/* Hero */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], rotate: [90, 0, 90] }}
            transition={{ duration: 16, repeat: Infinity }}
            className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 font-poppins">My Profile</h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">Your account details and verified contact info.</p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-gray-600">Signed in as {user?.phone ?? "—"}</div>
              <button
                onClick={logout}
                className="min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Logout
              </button>
            </div>

            {notice ? (
              <div
                className={
                  "mt-6 rounded-xl px-4 py-3 text-sm border " +
                  (notice.kind === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900")
                }
                role="status"
                aria-live="polite"
              >
                {notice.message}
              </div>
            ) : null}

            <div className="mt-6 bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 font-poppins">Profile details</h2>
                  <p className="mt-1 text-gray-600 text-sm">You can edit your name and email. Phone is tied to OTP verification.</p>
                </div>

                {isEditing ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setNotice(null);
                        setDraftName(initial.name);
                        setDraftEmail(initial.email);
                        setIsEditing(false);
                      }}
                      className="min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={onSave}
                      className="min-h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-white font-semibold shadow-lg hover:shadow-xl disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setNotice(null);
                      setIsEditing(true);
                    }}
                    className="min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                )}
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-semibold text-gray-700">Name</div>
                  {isEditing ? (
                    <input
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      placeholder="Your name"
                      autoComplete="name"
                    />
                  ) : (
                    <div className="mt-1 text-gray-900">{user?.name ?? "—"}</div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700">Phone</div>
                  <div className="mt-1 text-gray-900">{user?.phone ?? "—"}</div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700">Email</div>
                  {isEditing ? (
                    <input
                      value={draftEmail}
                      onChange={(e) => setDraftEmail(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      placeholder="you@example.com"
                      autoComplete="email"
                      inputMode="email"
                    />
                  ) : (
                    <div className="mt-1 text-gray-900">{user?.email ?? "—"}</div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700">Verified</div>
                  <div className="mt-1 text-gray-900">{user?.isVerified ? "Yes" : "No"}</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
