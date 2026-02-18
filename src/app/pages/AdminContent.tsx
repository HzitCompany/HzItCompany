import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";

import { Seo } from "../components/Seo";
import { useAuth } from "../auth/AuthProvider";
import { fetchAdminContent, upsertAdminContent } from "../services/platformService";

export function AdminContent() {
  const { isAuthed, role, logout: authLogout } = useAuth();

  const [items, setItems] = useState<Array<{ key: string; value: unknown; updated_at: string }>>([])
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [draftKey, setDraftKey] = useState("");
  const [draftValue, setDraftValue] = useState("{}");

  function logout() {
    authLogout();
  }

  function load() {
    if (!isAuthed) return;
    setError(null);
    setLoading(true);
    fetchAdminContent()
      .then((r: any) => setItems(r.items))
      .catch((e: any) => setError(e?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!isAuthed) return;
    if (role !== "admin") return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, role]);

  async function save() {
    if (!isAuthed) return;
    setError(null);

    const key = draftKey.trim();
    if (!key) {
      setError("Key is required");
      return;
    }

    let value: unknown;
    try {
      value = JSON.parse(draftValue);
    } catch {
      setError("Value must be valid JSON");
      return;
    }

    setLoading(true);
    try {
      await upsertAdminContent({ key, value });
      setDraftKey("");
      setDraftValue("{}");
      load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
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
      <Seo title="Admin Content" description="Manage site content." path="/admin/content" />

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
              <h1 className="text-3xl md:text-4xl font-bold font-poppins">Content</h1>
              <p className="mt-2 text-gray-300">Edit site_content key/value JSON.</p>
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
                <Link className="text-left rounded-lg px-3 py-2 hover:bg-gray-50" to="/admin/dashboard">Dashboard</Link>
                <Link className="text-left rounded-lg px-3 py-2 hover:bg-gray-50" to="/admin/orders">Orders</Link>
                <Link className="text-left rounded-lg px-3 py-2 hover:bg-gray-50" to="/admin/pricing">Pricing</Link>
                <Link className="text-left rounded-lg px-3 py-2 hover:bg-gray-50" to="/admin/leads">Leads</Link>
                <Link className="text-left rounded-lg px-3 py-2 hover:bg-gray-50" to="/admin/submissions">Submissions</Link>
                <Link className="text-left rounded-lg px-3 py-2 hover:bg-gray-50" to="/admin/careers">Careers</Link>
                  <Link className="text-left rounded-lg px-3 py-2 hover:bg-gray-50" to="/admin/otp">
                    OTP Logs
                  </Link>
                  <Link className="text-left rounded-lg px-3 py-2 bg-gray-900 text-white" to="/admin/content">Content</Link>
              </nav>
              <button onClick={logout} className="mt-6 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50">
                Logout
              </button>
            </aside>

            <main className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 font-poppins">Site content</h2>
                  <p className="mt-1 text-gray-600">Upsert JSON values by key.</p>
                </div>
                {loading ? <div className="text-sm text-gray-500">Loading…</div> : null}
              </div>

              {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div> : null}

              <div className="mt-6 grid gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
                  <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={draftKey}
                    onChange={(e) => setDraftKey(e.target.value)}
                    placeholder="home.hero"
                  />
                </div>
                <div>
                  <label htmlFor="contentValue" className="block text-sm font-medium text-gray-700 mb-1">Value (JSON)</label>
                  <textarea
                    id="contentValue"
                    className="w-full min-h-32 rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs"
                    value={draftValue}
                    onChange={(e) => setDraftValue(e.target.value)}
                    placeholder='{"title":"Hello"}'
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={save}
                    disabled={loading}
                    className={
                      "inline-flex min-h-11 items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black " +
                      (loading ? "opacity-70 cursor-not-allowed" : "")
                    }
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={load}
                    disabled={loading}
                    className={
                      "inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 " +
                      (loading ? "opacity-70 cursor-not-allowed" : "")
                    }
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="mt-8 overflow-auto rounded-xl border border-gray-200 bg-white">
                <table className="min-w-[820px] w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left px-4 py-3">Key</th>
                      <th className="text-left px-4 py-3">Updated</th>
                      <th className="text-left px-4 py-3">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td className="px-4 py-4 text-gray-600" colSpan={3}>
                          No content found.
                        </td>
                      </tr>
                    ) : (
                      items.map((it) => (
                        <tr key={it.key} className="border-t border-gray-100">
                          <td className="px-4 py-3 font-semibold text-gray-900">{it.key}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {it.updated_at ? new Date(it.updated_at).toLocaleString() : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(it.value, null, 2)}</pre>
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
