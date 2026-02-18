import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";

import { Seo } from "../components/Seo";
import { useAuth } from "../auth/AuthProvider";
import {
  createAdminCareerDownloadUrl,
  fetchAdminCareers,
  type CareerApplicationStatus,
  updateAdminCareerStatus
} from "../services/platformService";

const statuses: Array<{ label: string; value: CareerApplicationStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Reviewing", value: "reviewing" },
  { label: "Shortlisted", value: "shortlisted" },
  { label: "Rejected", value: "rejected" },
  { label: "Hired", value: "hired" }
];

export function AdminCareers() {
  const { isAuthed, role, logout } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<CareerApplicationStatus | "all">("all");

  useEffect(() => {
    if (!isAuthed) return;
    if (role !== "admin") return;

    setError(null);
    setLoading(true);

    fetchAdminCareers({
      q: q.trim() || undefined,
      status: status === "all" ? undefined : status,
      limit: 200
    })
      .then((r) => setItems(r.items))
      .catch((e: any) => setError(e?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [isAuthed, role, q, status]);

  const rows = useMemo(() => items ?? [], [items]);

  async function download(id: number, kind: "resume" | "cv") {
    if (!isAuthed) return;
    setError(null);
    try {
      const r = await createAdminCareerDownloadUrl(id, kind);
      window.open(r.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setError(e?.message ?? "Failed to create download link");
    }
  }

  async function setRowStatus(id: number, next: CareerApplicationStatus) {
    if (!isAuthed) return;
    setError(null);
    setLoading(true);
    try {
      await updateAdminCareerStatus(id, next);
      const r = await fetchAdminCareers({
        q: q.trim() || undefined,
        status: status === "all" ? undefined : status,
        limit: 200
      });
      setItems(r.items);
    } catch (e: any) {
      setError(e?.message ?? "Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-10">
            <h1 className="text-2xl font-bold text-gray-900">Please login</h1>
            <p className="mt-2 text-gray-600">Admin access required.</p>
            <Link to="/admin/login" className="mt-6 inline-flex rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-black">
              Go to admin login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-10">
            <h1 className="text-2xl font-bold text-gray-900">Forbidden</h1>
            <p className="mt-2 text-gray-600">This account does not have admin access.</p>
            <Link
              to="/portal"
              className="mt-6 inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Go to client portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Seo title="Admin Careers" description="Manage career applications." path="/admin/careers" />

      <section className="relative pt-28 pb-10 bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-poppins">Careers</h1>
              <p className="mt-2 text-gray-300">Review applications and download resumes.</p>
            </div>
            <button
              onClick={logout}
              className="hidden sm:inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-semibold hover:bg-white/15"
            >
              Logout
            </button>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl border border-white/40 shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
            <aside className="border-b md:border-b-0 md:border-r border-gray-200 p-4">
              <div className="text-lg font-bold text-gray-900 font-poppins">Admin</div>
              <nav className="mt-4 grid gap-2">
                <Link className="text-left rounded-lg px-3 py-2 hover:bg-gray-50" to="/admin/dashboard">
                  Dashboard
                </Link>
                <Link className="text-left rounded-lg px-3 py-2 hover:bg-gray-50" to="/admin/orders">
                  Orders
                </Link>
                <Link className="text-left rounded-lg px-3 py-2 hover:bg-gray-50" to="/admin/pricing">
                  Pricing
                </Link>
                <Link className="text-left rounded-lg px-3 py-2 hover:bg-gray-50" to="/admin/leads">
                  Leads
                </Link>
                <Link className="text-left rounded-lg px-3 py-2 hover:bg-gray-50" to="/admin/submissions">
                  Submissions
                </Link>
                <Link className="text-left rounded-lg px-3 py-2 bg-gray-900 text-white" to="/admin/careers">
                  Careers
                </Link>
                <Link className="text-left rounded-lg px-3 py-2 hover:bg-gray-50" to="/admin/otp">
                  OTP Logs
                </Link>
                <Link className="text-left rounded-lg px-3 py-2 hover:bg-gray-50" to="/admin/content">
                  Content
                </Link>
              </nav>
              <button onClick={logout} className="mt-6 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50">
                Logout
              </button>
            </aside>

            <main className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 font-poppins">Career applications</h2>
                  <p className="mt-1 text-gray-600">Search and update status.</p>
                </div>
                {loading ? <div className="text-sm text-gray-500">Loading…</div> : null}
              </div>

              {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div> : null}

              <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
                <input
                  className="w-full sm:max-w-sm rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="Search (name, email, phone, position)…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />

                <select
                  className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  aria-label="Filter by status"
                  title="Filter by status"
                >
                  {statuses.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 overflow-auto rounded-xl border border-gray-200 bg-white">
                <table className="min-w-[980px] w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left px-4 py-3">Created</th>
                      <th className="text-left px-4 py-3">Candidate</th>
                      <th className="text-left px-4 py-3">Position</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Files</th>
                      <th className="text-left px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td className="px-4 py-4 text-gray-600" colSpan={6}>
                          No applications found.
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => (
                        <tr key={r.id} className="border-t border-gray-100">
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{r.full_name}</div>
                            <div className="text-gray-600">{r.email}{r.phone ? ` • ${r.phone}` : ""}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{r.position}</td>
                          <td className="px-4 py-3">
                            <select
                              className="rounded-lg border border-gray-300 px-2 py-1"
                              value={r.status}
                              onChange={(e) => setRowStatus(r.id, e.target.value as CareerApplicationStatus)}
                              disabled={loading}
                              aria-label="Update application status"
                              title="Update application status"
                            >
                              {statuses
                                .filter((s) => s.value !== "all")
                                .map((s) => (
                                  <option key={s.value} value={s.value}>
                                    {s.label}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => download(r.id, "resume")}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50"
                              >
                                Resume
                              </button>
                              <button
                                type="button"
                                onClick={() => download(r.id, "cv")}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50"
                              >
                                CV
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <details className="text-gray-700">
                              <summary className="cursor-pointer select-none">View message</summary>
                              <div className="mt-2 whitespace-pre-wrap text-gray-700">
                                {r.message || "—"}
                              </div>
                            </details>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
