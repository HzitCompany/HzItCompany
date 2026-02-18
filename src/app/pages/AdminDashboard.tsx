import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";

import { Seo } from "../components/Seo";
import { useAuth } from "../auth/AuthProvider";
import {
  fetchAdminContactLeads,
  fetchAdminHireLeads,
  fetchAdminOrders,
  fetchAdminPricing,
  fetchAdminSummary,
  fetchAdminSubmissions,
  upsertAdminPricing,
  deleteAdminSubmission,
} from "../services/platformService";

type Tab = "summary" | "orders" | "pricing" | "leads" | "submissions";

export function AdminDashboard({ initialTab }: { initialTab?: Tab }) {
  const { isAuthed, role, logout } = useAuth();

  const [tab, setTab] = useState<Tab>(initialTab ?? "summary");
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<{ orders: number; paidOrders: number; revenueInr: number } | null>(null);

  const [orders, setOrders] = useState<any[]>([]);
  const [orderSearch, setOrderSearch] = useState("");

  const [pricing, setPricing] = useState<any[]>([]);
  const [pricingDraft, setPricingDraft] = useState({
    serviceKey: "",
    serviceName: "",
    planKey: "",
    planName: "",
    priceInr: 0,
    sortOrder: 0,
    isActive: true,
  });

  const [contactLeads, setContactLeads] = useState<any[]>([]);
  const [hireLeads, setHireLeads] = useState<any[]>([]);

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionSearch, setSubmissionSearch] = useState("");
  const [submissionType, setSubmissionType] = useState<"all" | "contact" | "hire" | "career">("all");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialTab) return;
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!isAuthed) return;
    if (role !== "admin") return;

    setError(null);
    setLoading(true);

    const load = async () => {
      if (!isAuthed) return;
      if (tab === "summary") {
        const r = await fetchAdminSummary();
        setSummary(r.totals);
      }
      if (tab === "orders") {
        const r = await fetchAdminOrders(orderSearch);
        setOrders(r.items);
      }
      if (tab === "pricing") {
        const r = await fetchAdminPricing();
        setPricing(r.items);
      }
      if (tab === "leads") {
        const [c, h] = await Promise.all([fetchAdminContactLeads(), fetchAdminHireLeads()]);
        setContactLeads(c.items);
        setHireLeads(h.items);
      }
      if (tab === "submissions") {
        const r = await fetchAdminSubmissions({
          q: submissionSearch,
          type: submissionType === "all" ? undefined : submissionType,
          limit: 200,
        });
        setSubmissions(r.items);
      }
    };

    load()
      .catch((e: any) => setError(e?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [isAuthed, role, tab, orderSearch, submissionSearch, submissionType]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => JSON.stringify(o).toLowerCase().includes(q));
  }, [orders, orderSearch]);

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
            <Link to="/portal" className="mt-6 inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50">
              Go to client portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function savePricing() {
    if (!isAuthed) return;
    setError(null);
    setLoading(true);
    try {
      await upsertAdminPricing({
        serviceKey: pricingDraft.serviceKey.trim(),
        serviceName: pricingDraft.serviceName.trim(),
        planKey: pricingDraft.planKey.trim(),
        planName: pricingDraft.planName.trim(),
        priceInr: Number(pricingDraft.priceInr),
        sortOrder: Number(pricingDraft.sortOrder),
        isActive: Boolean(pricingDraft.isActive),
      });
      const r = await fetchAdminPricing();
      setPricing(r.items);
      setPricingDraft({ serviceKey: "", serviceName: "", planKey: "", planName: "", priceInr: 0, sortOrder: 0, isActive: true });
    } catch (e: any) {
      setError(e?.message ?? "Failed to save pricing");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Seo title="Admin Dashboard" description="Manage orders, pricing, and leads." path="/admin" />

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
              <h1 className="text-3xl md:text-4xl font-bold font-poppins">Admin Dashboard</h1>
              <p className="mt-2 text-gray-300">Manage orders, pricing, and leads.</p>
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
              <div className="text-lg font-bold text-gray-900 font-poppins">
                Admin
              </div>
              <nav className="mt-4 grid gap-2">
                <Link className={`text-left rounded-lg px-3 py-2 ${tab === "summary" ? "bg-gray-900 text-white" : "hover:bg-gray-50"}`} to="/admin/dashboard">
                  Dashboard
                </Link>
                <Link className={`text-left rounded-lg px-3 py-2 ${tab === "orders" ? "bg-gray-900 text-white" : "hover:bg-gray-50"}`} to="/admin/orders">
                  Orders
                </Link>
                <Link className={`text-left rounded-lg px-3 py-2 ${tab === "pricing" ? "bg-gray-900 text-white" : "hover:bg-gray-50"}`} to="/admin/pricing">
                  Pricing
                </Link>
                <Link className={`text-left rounded-lg px-3 py-2 ${tab === "leads" ? "bg-gray-900 text-white" : "hover:bg-gray-50"}`} to="/admin/leads">
                  Leads
                </Link>
                <Link className={`text-left rounded-lg px-3 py-2 ${tab === "submissions" ? "bg-gray-900 text-white" : "hover:bg-gray-50"}`} to="/admin/submissions">
                  Submissions
                </Link>
                <Link className="text-left rounded-lg px-3 py-2 hover:bg-gray-50" to="/admin/careers">
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
                  <h1 className="text-2xl font-bold text-gray-900 font-poppins">
                    {tab === "summary"
                      ? "Dashboard"
                      : tab === "orders"
                        ? "Orders"
                        : tab === "pricing"
                          ? "Pricing"
                          : tab === "leads"
                            ? "Leads"
                            : "Submissions"}
                  </h1>
                  <p className="mt-1 text-gray-600">Manage the IT services platform.</p>
                </div>
                {loading ? <div className="text-sm text-gray-500">Loading…</div> : null}
              </div>

              {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div> : null}

              {tab === "summary" ? (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-sm text-gray-600">Total orders</div>
                    <div className="mt-1 text-2xl font-bold text-gray-900">{summary?.orders ?? "—"}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-sm text-gray-600">Paid orders</div>
                    <div className="mt-1 text-2xl font-bold text-gray-900">{summary?.paidOrders ?? "—"}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-sm text-gray-600">Revenue</div>
                    <div className="mt-1 text-2xl font-bold text-gray-900">₹{Number(summary?.revenueInr ?? 0).toLocaleString("en-IN")}</div>
                  </div>
                </div>
              ) : null}

              {tab === "orders" ? (
                <div className="mt-6">
                  <input
                    className="w-full sm:max-w-sm rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="Search (name, email, id)…"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                  />
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-gray-600">
                        <tr>
                          <th className="py-2">Order</th>
                          <th className="py-2">Client</th>
                          <th className="py-2">Service</th>
                          <th className="py-2">Plan</th>
                          <th className="py-2">Amount</th>
                          <th className="py-2">Payment</th>
                          <th className="py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((o) => (
                          <tr key={o.id} className="border-t border-gray-100">
                            <td className="py-3 font-medium text-gray-900">#{o.id}</td>
                            <td className="py-3 text-gray-800">{o.name} • {o.email}</td>
                            <td className="py-3 text-gray-800">{o.service_name}</td>
                            <td className="py-3 text-gray-800">{o.plan_name}</td>
                            <td className="py-3 text-gray-800">₹{Number(o.price_inr).toLocaleString("en-IN")}</td>
                            <td className="py-3 text-gray-800">{o.payment_status}</td>
                            <td className="py-3 text-gray-800">{o.project_status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {tab === "pricing" ? (
                <div className="mt-6 grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 p-4">
                      <div className="font-semibold text-gray-900">Add / Update pricing</div>
                      <div className="mt-3 grid gap-3">
                        <input className="rounded-lg border border-gray-300 px-3 py-2" placeholder="serviceKey" value={pricingDraft.serviceKey} onChange={(e) => setPricingDraft((s) => ({ ...s, serviceKey: e.target.value }))} />
                        <input className="rounded-lg border border-gray-300 px-3 py-2" placeholder="serviceName" value={pricingDraft.serviceName} onChange={(e) => setPricingDraft((s) => ({ ...s, serviceName: e.target.value }))} />
                        <input className="rounded-lg border border-gray-300 px-3 py-2" placeholder="planKey" value={pricingDraft.planKey} onChange={(e) => setPricingDraft((s) => ({ ...s, planKey: e.target.value }))} />
                        <input className="rounded-lg border border-gray-300 px-3 py-2" placeholder="planName" value={pricingDraft.planName} onChange={(e) => setPricingDraft((s) => ({ ...s, planName: e.target.value }))} />
                        <input type="number" className="rounded-lg border border-gray-300 px-3 py-2" placeholder="priceInr" value={pricingDraft.priceInr} onChange={(e) => setPricingDraft((s) => ({ ...s, priceInr: Number(e.target.value) }))} />
                        <input type="number" className="rounded-lg border border-gray-300 px-3 py-2" placeholder="sortOrder" value={pricingDraft.sortOrder} onChange={(e) => setPricingDraft((s) => ({ ...s, sortOrder: Number(e.target.value) }))} />
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" checked={pricingDraft.isActive} onChange={(e) => setPricingDraft((s) => ({ ...s, isActive: e.target.checked }))} />
                          Active
                        </label>
                        <button onClick={savePricing} disabled={loading} className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-black disabled:opacity-50">
                          Save
                        </button>
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4">
                      <div className="font-semibold text-gray-900">Existing pricing</div>
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="text-left text-gray-600">
                            <tr>
                              <th className="py-2">Service</th>
                              <th className="py-2">Plan</th>
                              <th className="py-2">Price</th>
                              <th className="py-2">Active</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pricing.map((p) => (
                              <tr key={p.id} className="border-t border-gray-100">
                                <td className="py-3 text-gray-800">{p.service_name}</td>
                                <td className="py-3 text-gray-800">{p.plan_name}</td>
                                <td className="py-3 text-gray-800">₹{Number(p.price_inr).toLocaleString("en-IN")}</td>
                                <td className="py-3 text-gray-800">{p.is_active ? "Yes" : "No"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === "leads" ? (
                <div className="mt-6 grid gap-6">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="font-semibold text-gray-900">Contact messages</div>
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="text-left text-gray-600">
                          <tr>
                            <th className="py-2">Name</th>
                            <th className="py-2">Email</th>
                            <th className="py-2">Phone</th>
                            <th className="py-2">Subject</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contactLeads.map((x) => (
                            <tr key={x.id} className="border-t border-gray-100">
                              <td className="py-3 text-gray-800">{x.name}</td>
                              <td className="py-3 text-gray-800">{x.email}</td>
                              <td className="py-3 text-gray-800">{x.phone ?? "—"}</td>
                              <td className="py-3 text-gray-800">{x.subject}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="font-semibold text-gray-900">Hire requests</div>
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="text-left text-gray-600">
                          <tr>
                            <th className="py-2">Name</th>
                            <th className="py-2">Email</th>
                            <th className="py-2">Company</th>
                            <th className="py-2">Project</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hireLeads.map((x) => (
                            <tr key={x.id} className="border-t border-gray-100">
                              <td className="py-3 text-gray-800">{x.name}</td>
                              <td className="py-3 text-gray-800">{x.email}</td>
                              <td className="py-3 text-gray-800">{x.company ?? "—"}</td>
                              <td className="py-3 text-gray-800">{x.project_name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === "submissions" ? (
                <div className="mt-6">
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <input
                      className="w-full sm:max-w-sm rounded-lg border border-gray-300 px-3 py-2"
                      placeholder="Search submissions…"
                      value={submissionSearch}
                      onChange={(e) => setSubmissionSearch(e.target.value)}
                    />
                    <select
                      className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2"
                      aria-label="Submission type"
                      value={submissionType}
                      onChange={(e) => setSubmissionType(e.target.value as any)}
                    >
                      <option value="all">All types</option>
                      <option value="contact">Contact</option>
                      <option value="hire">Hire</option>
                      <option value="career">Career</option>
                    </select>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-gray-600">
                        <tr>
                          <th className="py-2">ID</th>
                          <th className="py-2">Type</th>
                          <th className="py-2">Created</th>
                          <th className="py-2">User</th>
                          <th className="py-2">Summary</th>
                          <th className="py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map((s) => {
                          const data = (s.data ?? {}) as any;
                          const summary =
                            s.type === "contact"
                              ? data.subject
                              : s.type === "hire"
                                ? data.projectName
                                : data.role;

                          return (
                            <tr key={s.id} className="border-t border-gray-100">
                              <td className="py-3 font-medium text-gray-900">#{s.id}</td>
                              <td className="py-3 text-gray-800">{String(s.type)}</td>
                              <td className="py-3 text-gray-800">{String(s.created_at ?? "")}</td>
                              <td className="py-3 text-gray-800">{String(s.user_email ?? "—")} • {String(s.user_phone ?? "—")}</td>
                              <td className="py-3 text-gray-800">{summary ? String(summary) : "—"}</td>
                              <td className="py-3">
                                <button
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-700 hover:bg-rose-100"
                                  onClick={async () => {
                                    if (!isAuthed) return;
                                    if (!confirm("Delete this submission?")) return;
                                    setError(null);
                                    setLoading(true);
                                    try {
                                      await deleteAdminSubmission(Number(s.id));
                                      const r = await fetchAdminSubmissions({
                                        q: submissionSearch,
                                        type: submissionType === "all" ? undefined : submissionType,
                                        limit: 200,
                                      });
                                      setSubmissions(r.items);
                                    } catch (e: any) {
                                      setError(e?.message ?? "Failed to delete");
                                    } finally {
                                      setLoading(false);
                                    }
                                  }}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
