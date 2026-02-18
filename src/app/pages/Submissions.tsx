import { useEffect, useState } from "react";
import { motion } from "motion/react";

import { Seo } from "../components/Seo";
import { useAuth } from "../auth/AuthProvider";
import { fetchMySubmissions, type SubmissionItem } from "../services/submissionsService";
import { CmsSlot } from "../components/cms/CmsBlocks";

function formatDate(d: string) {
  const dt = new Date(d);
  if (!Number.isFinite(dt.getTime())) return d;
  return dt.toLocaleString();
}

export function Submissions() {
  const { isAuthed } = useAuth();
  const [items, setItems] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthed) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchMySubmissions()
      .then((r) => {
        if (!mounted) return;
        setItems(r.items ?? []);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load submissions");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isAuthed]);

  return (
    <div className="min-h-screen">
      <Seo title="My Submissions" description="View your recent submissions." path="/submissions" />

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
            <h1 className="text-5xl md:text-6xl font-bold mb-4 font-poppins">My Submissions</h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              Contact, hire, and career requests you’ve sent.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl">
              {error ? (
                <div className="p-6 text-sm text-rose-700 bg-rose-50 border-b border-rose-100">{error}</div>
              ) : null}

              {loading ? (
                <div className="p-6 text-gray-700">Loading…</div>
              ) : items.length === 0 ? (
                <div className="p-6 text-gray-700">No submissions yet.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const data = (item.data ?? {}) as any;
                    const title =
                      item.type === "contact"
                        ? data.subject || "Contact"
                        : item.type === "hire"
                          ? data.projectName || "Hire Us"
                          : data.role || "Career";

                    const subtitle =
                      item.type === "contact"
                        ? data.email
                        : item.type === "hire"
                          ? (data.deliveryDays ? `${data.deliveryDays} days` : undefined)
                          : data.email;

                    return (
                      <div key={item.id} className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {String(title || item.type)}
                            </div>
                            <div className="mt-1 text-xs text-gray-600">
                              {String(item.type).toUpperCase()} • {formatDate(item.created_at)}
                              {subtitle ? ` • ${String(subtitle)}` : ""}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">#{item.id}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Admin-managed page blocks */}
      <CmsSlot contentKey="page.submissions" />
    </div>
  );
}
