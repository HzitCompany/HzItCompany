import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";

import { Seo } from "../components/Seo";
import { useAuth } from "../auth/AuthProvider";
import { AdminShell } from "../components/admin/AdminShell";
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
  const { isAuthed, role } = useAuth();

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
      .then((r: any) => setItems(r.items))
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

  if (!isAuthed || role !== "admin") {
    return <div className="p-10 text-center">Access Denied</div>;
  }

  return (
    <AdminShell title="Careers">
      <Seo title="Admin Careers" description="Manage career applications." path="/admin/careers" />

      <div className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6"
        >
          <div className="text-sm text-gray-600">Applications</div>
          <div className="text-2xl md:text-3xl font-bold font-poppins">Career applications</div>
          <div className="mt-1 text-sm text-gray-600">Search, update status, and download resumes.</div>
        </motion.div>
      </div>

      {error ? <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">{error}</div> : null}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <input
              className="w-full sm:w-80 min-h-11 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30"
              placeholder="Search (name, email, phone, position)…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="w-full sm:w-auto min-h-11 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              aria-label="Filter by status"
              title="Filter by status"
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value} className="text-gray-900">
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          {loading ? <div className="text-sm text-gray-600">Loading…</div> : null}
        </div>

        <div className="mt-6 overflow-auto rounded-2xl border border-gray-200 bg-white">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-left px-4 py-3">Candidate</th>
                <th className="text-left px-4 py-3">Position</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Resume</th>
                <th className="text-left px-4 py-3">Message</th>
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
                  <tr key={r.id} className="border-t border-gray-200">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{r.full_name}</div>
                      <div className="text-gray-600">
                        {r.email}
                        {r.phone ? ` • ${r.phone}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.position}</td>
                    <td className="px-4 py-3">
                      <select
                        className="min-h-10 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30"
                        value={r.status}
                        onChange={(e) => setRowStatus(r.id, e.target.value as CareerApplicationStatus)}
                        disabled={loading}
                        aria-label="Update application status"
                        title="Update application status"
                      >
                        {statuses
                          .filter((s) => s.value !== "all")
                          .map((s) => (
                            <option key={s.value} value={s.value} className="text-gray-900">
                              {s.label}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => download(r.id, "resume")}
                          className="min-h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold hover:bg-gray-50"
                        >
                          Download Resume
                        </button>
                        <button
                          type="button"
                          onClick={() => download(r.id, "cv")}
                          className="min-h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold hover:bg-gray-50"
                        >
                          Download CV
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <details className="text-gray-800">
                        <summary className="cursor-pointer select-none text-gray-600 hover:text-gray-900">View</summary>
                        <div className="mt-2 whitespace-pre-wrap text-gray-800">{r.message || "—"}</div>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
