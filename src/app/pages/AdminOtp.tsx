import { useEffect, useState } from "react";
import { Link } from "react-router";

import { Seo } from "../components/Seo";
import { useAuth } from "../auth/AuthProvider";
import { fetchAdminOtpLogs } from "../services/platformService";

export function AdminOtp() {
  const { isAuthed, role } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthed || role !== "admin") {
      location.href = "/admin/login";
      return;
    }

    setLoading(true);
    setError(null);
    fetchAdminOtpLogs({ limit: 200 })
      .then((r) => setItems(r.items ?? []))
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, [isAuthed, role]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Seo title="Admin OTP Logs" description="View OTP requests." path="/admin/otp" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <div className="rounded-2xl bg-white/80 border border-white/60 shadow-[0_12px_40px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="p-6 sm:p-8 flex items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-poppins">OTP Logs</h1>
              <p className="mt-2 text-gray-600 text-sm">Recent OTP requests (no OTP values are shown).</p>
            </div>
            <Link to="/admin/dashboard" className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-black">
              Back
            </Link>
          </div>

          {error && <div className="mx-6 mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

          <div className="px-6 pb-8">
            {loading ? (
              <div className="text-sm text-gray-600">Loading…</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-gray-600">No OTP records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2 pr-4">Created</th>
                      <th className="py-2 pr-4">Channel</th>
                      <th className="py-2 pr-4">Destination</th>
                      <th className="py-2 pr-4">Expires</th>
                      <th className="py-2 pr-4">Used</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-900">
                    {items.map((row) => (
                      <tr key={row.id} className="border-t border-gray-100">
                        <td className="py-2 pr-4 whitespace-nowrap">{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</td>
                        <td className="py-2 pr-4 whitespace-nowrap">{row.channel ?? "—"}</td>
                        <td className="py-2 pr-4">{row.destination ?? row.user_phone ?? row.user_email ?? "—"}</td>
                        <td className="py-2 pr-4 whitespace-nowrap">{row.expires_at ? new Date(row.expires_at).toLocaleString() : "—"}</td>
                        <td className="py-2 pr-4 whitespace-nowrap">{row.consumed_at ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
