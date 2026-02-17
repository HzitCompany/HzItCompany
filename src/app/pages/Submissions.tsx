import { useEffect, useState } from "react";

import { Seo } from "../components/Seo";
import { useAuth } from "../auth/AuthProvider";
import { fetchMySubmissions, type SubmissionItem } from "../services/submissionsService";

function formatDate(d: string) {
  const dt = new Date(d);
  if (!Number.isFinite(dt.getTime())) return d;
  return dt.toLocaleString();
}

export function Submissions() {
  const { token } = useAuth();
  const [items, setItems] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchMySubmissions(token)
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
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Seo title="My Submissions" description="View your recent submissions." path="/submissions" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-poppins">My Submissions</h1>
          <p className="mt-2 text-gray-600">Contact, hire, and career requests you’ve sent.</p>
        </div>

        <div className="mt-8 bg-white rounded-2xl border border-gray-200 overflow-hidden">
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
                      ? data.budget
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
      </div>
    </div>
  );
}
