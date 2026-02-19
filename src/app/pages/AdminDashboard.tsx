import { Fragment, useEffect, useState } from "react";
import { motion } from "motion/react";
import { useAuth } from "../auth/AuthProvider";
import { Seo } from "../components/Seo";
import { Button } from "../components/ui/button";
import { AdminShell } from "../components/admin/AdminShell";
import {
  fetchAdminPortalStats,
  fetchAdminUsers,
  updateUserRole,
  fetchAdminSubmissions,
        updateAdminSubmissionStatus,
    fetchAdminPricing,
    createAdminResumesDownloadUrlByPath,
} from "../services/platformService";

type Tab = "summary" | "users" | "orders" | "pricing" | "submissions";

const submissionStatuses = ["new", "reviewing", "shortlisted", "rejected", "hired"] as const;

function formatSubmissionStatus(status?: string | null) {
    if (!status) return "—";
    return status
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function getAdminEmail(): string {
    const envAny = (import.meta as any).env ?? {};
    return ((envAny.VITE_ADMIN_EMAIL as string | undefined) ?? "hzitcompany@gmail.com")
        .trim()
        .toLowerCase();
}

export function AdminDashboard({ initialTab = "summary" }: { initialTab?: string }) {
    const { isAuthed, role, user } = useAuth();
    const [tab, setTab] = useState<Tab>(initialTab as Tab);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data States
    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [pricing, setPricing] = useState<any[]>([]);

    const [expandedSubmissionId, setExpandedSubmissionId] = useState<number | null>(null);
    const [downloadBusyKey, setDownloadBusyKey] = useState<string | null>(null);
    const [statusSavingId, setStatusSavingId] = useState<number | null>(null);
    
    // Pagination / Search
    const [userPage, setUserPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);

    useEffect(() => {
        if (!isAuthed || role !== "admin") return;
        loadTab(tab);
    }, [tab, isAuthed, role, userPage]);

    useEffect(() => {
        setTab(initialTab as Tab);
        setError(null);
        // reset per-tab pagination when switching routes
        setUserPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialTab]);
    

    const adminEmail = getAdminEmail();
    const isAdminEmail = (user?.email ?? "").trim().toLowerCase() === adminEmail;

        async function loadTab(t: Tab) {
                setLoading(true);
                setError(null);
                try {
                        if (t === "summary") {
                                const res = await fetchAdminPortalStats();
                                setStats(res.stats);
                        } else if (t === "users") {
                                const res = await fetchAdminUsers(userPage);
                                setUsers(res.items);
                                setTotalUsers(res.total);
                        } else if (t === "orders") {
                                const res = await fetchAdminSubmissions({ type: "hire" });
                                setOrders(res.items);
                } else if (t === "pricing") {
                    const res = await fetchAdminPricing();
                    setPricing(res.items);
                        } else if (t === "submissions") {
                                const res = await fetchAdminSubmissions();
                                setSubmissions(res.items);
                        }
                } catch (err: any) {
                        setError(err.message || "Failed to load data");
                } finally {
                        setLoading(false);
                }
        }

        async function promoteUser(id: string, newRole: "admin" | "user") {
                try {
                        await updateUserRole(id, newRole);
                        // reload users
                        loadTab("users");
                } catch (err: any) {
                        setError(err.message);
                }
        }

    // RequireAdmin already guards this route, but keep a defensive check.
    if (!isAuthed || role !== "admin" || !isAdminEmail) {
        return <div className="p-10 text-center">Access Denied</div>;
    }

    const shellTitle =
        tab === "summary" ? "Overview" :
        tab === "users" ? "Users" :
        tab === "orders" ? "Hire List" :
        tab === "pricing" ? "Pricing" :
        tab === "submissions" ? "Submissions" :
        "Admin";

    return (
        <AdminShell title={shellTitle}>
            <Seo title="Admin Dashboard" description="HZ Company Admin" path="/admin" />

            <div className="mb-6">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6"
                >
                    <div className="text-sm text-gray-600">Welcome</div>
                    <div className="text-2xl md:text-3xl font-bold font-poppins">{user?.full_name || "Admin"}</div>
                    <div className="mt-1 text-sm text-gray-600">Manage users, submissions, pricing and orders.</div>
                </motion.div>
            </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800"
                    >
                        <p className="text-sm">{error}</p>
                    </motion.div>
                )}

                {/* Content */}
                {loading && <div className="text-gray-600 py-4">Loading...</div>}

                {!loading && tab === "summary" && stats && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
                    >
                        <StatCard title="Total Users" value={stats.totalUsers} />
                        <StatCard title="Contact Submissions" value={stats.contactSubmissions} />
                        <StatCard title="Hire Requests" value={stats.hireSubmissions} />
                        <StatCard title="Career Applications" value={stats.careerApplications} />
                    </motion.div>
                )}

                {!loading && tab === "users" && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-2xl"
                    >
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Joined</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {users.map((u) => (
                                    <tr key={u.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                        <img className="h-10 w-10 rounded-full bg-gray-100" src={u.avatar_url || "https://www.gravatar.com/avatar?d=mp"} alt="" />
                                                </div>
                                                <div className="ml-4">
                                                        <div className="text-sm font-semibold text-gray-900">{u.full_name || "Unknown"}</div>
                                                        <div className="text-sm text-gray-600">{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-900">
                                                {u.role}
                                            </span>
                                        </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {new Date(u.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {u.role === "admin" ? (
                                                    <button onClick={() => promoteUser(u.id, "user")} className="text-blue-700 hover:text-blue-900 underline">Demote</button>
                                            ) : (
                                                    <button onClick={() => promoteUser(u.id, "admin")} className="text-blue-700 hover:text-blue-900 underline">Promote</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {/* Simple Pagination */}
                            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                            <div className="flex-1 flex justify-between sm:justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setUserPage(p => Math.max(1, p - 1))}
                                    disabled={userPage === 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    className="ml-3"
                                    onClick={() => setUserPage(p => p + 1)}
                                    disabled={users.length < 20}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {!loading && tab === "submissions" && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                                                className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                    >
                                                <div className="overflow-auto">
                                                    <table className="min-w-[980px] w-full text-sm">
                                                        <thead className="bg-gray-50 text-gray-600">
                                                            <tr>
                                                                <th className="text-left px-4 py-3">Created</th>
                                                                <th className="text-left px-4 py-3">Type</th>
                                                                <th className="text-left px-4 py-3">User</th>
                                                                <th className="text-left px-4 py-3">Summary</th>
                                                                <th className="text-left px-4 py-3">Status</th>
                                                                <th className="text-right px-4 py-3">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {submissions.length === 0 ? (
                                                                <tr>
                                                                    <td className="px-4 py-4 text-gray-600" colSpan={6}>
                                                                        No submissions found.
                                                                    </td>
                                                                </tr>
                                                            ) : (
                                                                submissions.map((sub: any) => {
                                                                    const created = sub.created_at ? new Date(sub.created_at).toLocaleString() : "—";
                                                                    const data = (sub.data ?? {}) as Record<string, unknown>;
                                                                    const summary =
                                                                        String(
                                                                            (data["subject"] ?? data["projectName"] ?? data["project_name"] ?? data["name"] ?? data["fullName"] ?? data["full_name"] ?? "")
                                                                        ).trim() || "—";
                                                                    const email = String(sub.user_email ?? data["email"] ?? "").trim();
                                                                    const phone = String(sub.user_phone ?? data["phone"] ?? "").trim();
                                                                    const isExpanded = expandedSubmissionId === sub.id;
                                                                    const statusValue = typeof sub.status === "string" ? sub.status : "new";

                                                                    const resumePath = (typeof data["resumePath"] === "string" ? data["resumePath"] :
                                                                        typeof data["resume_path"] === "string" ? data["resume_path"] :
                                                                        typeof data["resume_url"] === "string" ? data["resume_url"] :
                                                                        null) as string | null;

                                                                    const cvPath = (typeof data["cvPath"] === "string" ? data["cvPath"] :
                                                                        typeof data["cv_path"] === "string" ? data["cv_path"] :
                                                                        null) as string | null;

                                                                    async function downloadByPath(path: string, kindLabel: string) {
                                                                        if (path.startsWith("http://") || path.startsWith("https://")) {
                                                                            window.open(path, "_blank", "noopener,noreferrer");
                                                                            return;
                                                                        }
                                                                        const busyKey = `${sub.id}:${kindLabel}`;
                                                                        setError(null);
                                                                        setDownloadBusyKey(busyKey);
                                                                        try {
                                                                            const r = await createAdminResumesDownloadUrlByPath(path);
                                                                            window.open(r.url, "_blank", "noopener,noreferrer");
                                                                        } catch (e: any) {
                                                                            setError(e?.message ?? "Failed to create download link");
                                                                        } finally {
                                                                            setDownloadBusyKey(null);
                                                                        }
                                                                    }

                                                                    async function onChangeStatus(nextStatus: string) {
                                                                        if (!sub?.id) return;
                                                                        if (nextStatus === statusValue) return;
                                                                        setError(null);
                                                                        setStatusSavingId(sub.id);
                                                                        try {
                                                                            await updateAdminSubmissionStatus(Number(sub.id), nextStatus as any);
                                                                            setSubmissions((prev) =>
                                                                                prev.map((row: any) =>
                                                                                    row.id === sub.id
                                                                                        ? {
                                                                                            ...row,
                                                                                            status: nextStatus,
                                                                                            data: {
                                                                                                ...((row.data ?? {}) as Record<string, unknown>),
                                                                                                ...(row.type === "career" ? {} : { adminStatus: nextStatus })
                                                                                            }
                                                                                        }
                                                                                        : row
                                                                                )
                                                                            );
                                                                        } catch (e: any) {
                                                                            setError(e?.message ?? "Failed to update submission status");
                                                                        } finally {
                                                                            setStatusSavingId(null);
                                                                        }
                                                                    }

                                                                    return (
                                                                        <Fragment key={sub.id}>
                                                                            <tr key={sub.id} className="border-t border-gray-200">
                                                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{created}</td>
                                                                                <td className="px-4 py-3">
                                                                                    <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-900">
                                                                                        {String(sub.type ?? "—")}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-4 py-3">
                                                                                    <div className="font-semibold text-gray-900">{email || "—"}</div>
                                                                                    <div className="text-gray-600">{phone || "—"}</div>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-gray-700 max-w-[520px] truncate" title={summary}>
                                                                                    {summary}
                                                                                </td>
                                                                                <td className="px-4 py-3 whitespace-nowrap">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <select
                                                                                            value={statusValue}
                                                                                            onChange={(e) => void onChangeStatus(e.target.value)}
                                                                                            disabled={statusSavingId === sub.id}
                                                                                            className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900 disabled:opacity-60"
                                                                                        >
                                                                                            {submissionStatuses.map((st) => (
                                                                                                <option key={st} value={st}>{formatSubmissionStatus(st)}</option>
                                                                                            ))}
                                                                                        </select>
                                                                                        {statusSavingId === sub.id ? (
                                                                                            <span className="text-xs text-gray-500">Saving…</span>
                                                                                        ) : null}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setExpandedSubmissionId(isExpanded ? null : sub.id)}
                                                                                        className="min-h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold hover:bg-gray-50"
                                                                                    >
                                                                                        {isExpanded ? "Hide details" : "More details"}
                                                                                    </button>
                                                                                </td>
                                                                            </tr>

                                                                            {isExpanded ? (
                                                                                <tr className="border-t border-gray-200 bg-gray-50/40">
                                                                                    <td className="px-4 py-4" colSpan={6}>
                                                                                        <div className="grid gap-4">
                                                                                            <div className="rounded-2xl border border-gray-200 bg-white p-4">
                                                                                                <div className="text-sm font-semibold text-gray-900">Submitted fields</div>
                                                                                                <div className="mt-3 grid gap-2">
                                                                                                    {Object.keys(data).length === 0 ? (
                                                                                                        <div className="text-sm text-gray-600">No fields available.</div>
                                                                                                    ) : (
                                                                                                        Object.entries(data).map(([k, v]) => (
                                                                                                            <div key={k} className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-2">
                                                                                                                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{k}</div>
                                                                                                                <div className="text-sm text-gray-800 break-words whitespace-pre-wrap">
                                                                                                                    {typeof v === "string" && (v.startsWith("http://") || v.startsWith("https://")) ? (
                                                                                                                        <a
                                                                                                                            href={v}
                                                                                                                            target="_blank"
                                                                                                                            rel="noopener noreferrer"
                                                                                                                            className="text-blue-700 hover:text-blue-900 underline break-all"
                                                                                                                        >
                                                                                                                            {v}
                                                                                                                        </a>
                                                                                                                    ) : (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v == null)
                                                                                                                        ? String(v ?? "—")
                                                                                                                        : JSON.stringify(v, null, 2)}
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        ))
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>

                                                                                            {(resumePath || cvPath) ? (
                                                                                                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                                                                                                    <div className="text-sm font-semibold text-gray-900">Documents</div>
                                                                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                                                                        {resumePath ? (
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={() => downloadByPath(resumePath, "resume")}
                                                                                                                disabled={downloadBusyKey === `${sub.id}:resume`}
                                                                                                                className="min-h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
                                                                                                            >
                                                                                                                {resumePath.startsWith("http") ? "Open Resume" : "Download Resume"}
                                                                                                            </button>
                                                                                                        ) : null}
                                                                                                        {cvPath ? (
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={() => downloadByPath(cvPath, "cv")}
                                                                                                                disabled={downloadBusyKey === `${sub.id}:cv`}
                                                                                                                className="min-h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
                                                                                                            >
                                                                                                                {cvPath.startsWith("http") ? "Open CV" : "Download CV"}
                                                                                                            </button>
                                                                                                        ) : null}
                                                                                                    </div>
                                                                                                    <div className="mt-2 text-xs text-gray-500">Downloads use short-lived signed URLs.</div>
                                                                                                </div>
                                                                                            ) : null}
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            ) : null}
                                                                        </Fragment>
                                                                    );
                                                                })
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                    </motion.div>
                )}

                {!loading && tab === "orders" && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                    >
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Hire Us Applications</h2>
                                <p className="text-xs text-gray-500 mt-0.5">All requests submitted via the Hire Us form</p>
                            </div>
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                {orders.length} total
                            </span>
                        </div>
                        <div className="overflow-auto">
                            <table className="min-w-[900px] w-full text-sm">
                                <thead className="bg-gray-50 text-gray-600">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-semibold">Date</th>
                                        <th className="text-left px-4 py-3 font-semibold">Name</th>
                                        <th className="text-left px-4 py-3 font-semibold">Contact</th>
                                        <th className="text-left px-4 py-3 font-semibold">Project</th>
                                        <th className="text-left px-4 py-3 font-semibold">Services</th>
                                        <th className="text-left px-4 py-3 font-semibold">Status</th>
                                        <th className="text-right px-4 py-3 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {orders.length === 0 ? (
                                        <tr>
                                            <td className="px-4 py-8 text-gray-500 text-center" colSpan={7}>
                                                No hire us applications yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        orders.map((o: any) => {
                                            const data = (o.data ?? {}) as Record<string, unknown>;
                                            const name = String(data["name"] ?? data["fullName"] ?? o.user_email ?? "—");
                                            const email = String(o.user_email ?? data["email"] ?? "—");
                                            const phone = String(data["phone"] ?? o.user_phone ?? "—");
                                            const project = String(data["projectName"] ?? data["project_name"] ?? "—");
                                            const services = Array.isArray(data["services"])
                                                ? (data["services"] as string[]).join(", ")
                                                : String(data["services"] ?? "—");
                                            const statusValue = typeof o.status === "string" ? o.status : "new";
                                            const isExpanded = expandedSubmissionId === o.id;

                                            async function onChangeHireStatus(nextStatus: string) {
                                                if (!o?.id || nextStatus === statusValue) return;
                                                setError(null);
                                                setStatusSavingId(o.id);
                                                try {
                                                    await updateAdminSubmissionStatus(Number(o.id), nextStatus as any);
                                                    setOrders((prev) =>
                                                        prev.map((row: any) =>
                                                            row.id === o.id ? { ...row, status: nextStatus } : row
                                                        )
                                                    );
                                                } catch (e: any) {
                                                    setError(e?.message ?? "Failed to update status");
                                                } finally {
                                                    setStatusSavingId(null);
                                                }
                                            }

                                            return (
                                                <Fragment key={o.id}>
                                                    <tr className="hover:bg-gray-50/60 transition-colors">
                                                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                                                            {o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN") : "—"}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-semibold text-gray-900">{name}</div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="text-gray-700">{email}</div>
                                                            <div className="text-gray-500 text-xs">{phone}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate" title={project}>{project}</td>
                                                        <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate text-xs" title={services}>{services}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <select
                                                                    value={statusValue}
                                                                    onChange={(e) => void onChangeHireStatus(e.target.value)}
                                                                    disabled={statusSavingId === o.id}
                                                                    className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900 disabled:opacity-60"
                                                                >
                                                                    {submissionStatuses.map((st) => (
                                                                        <option key={st} value={st}>{formatSubmissionStatus(st)}</option>
                                                                    ))}
                                                                </select>
                                                                {statusSavingId === o.id ? <span className="text-xs text-gray-400">Saving…</span> : null}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                                            <button
                                                                type="button"
                                                                onClick={() => setExpandedSubmissionId(isExpanded ? null : o.id)}
                                                                className="min-h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold hover:bg-gray-50"
                                                            >
                                                                {isExpanded ? "Hide" : "Details"}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {isExpanded ? (
                                                        <tr className="border-t border-gray-100 bg-gray-50/40">
                                                            <td className="px-4 py-4" colSpan={7}>
                                                                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                                                                    <div className="text-sm font-semibold text-gray-900 mb-3">Full Submission</div>
                                                                    <div className="grid gap-2">
                                                                        {Object.entries(data)
                                                                            .filter(([k]) => !["adminStatus", "honeypot"].includes(k))
                                                                            .map(([k, v]) => (
                                                                                <div key={k} className="grid grid-cols-1 md:grid-cols-[200px,1fr] gap-2">
                                                                                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{k.replace(/([A-Z])/g, " $1")}</div>
                                                                                    <div className="text-sm text-gray-800 break-words whitespace-pre-wrap">
                                                                                        {typeof v === "string" && (v.startsWith("http://") || v.startsWith("https://")) ? (
                                                                                            <a href={v} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline break-all">{v}</a>
                                                                                        ) : Array.isArray(v) ? v.join(", ") : String(v ?? "—")}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ) : null}
                                                </Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {!loading && tab === "pricing" && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden"
                    >
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Service</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Plan</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Price (INR)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {pricing.length === 0 ? (
                                    <tr>
                                        <td className="px-6 py-4 text-gray-600" colSpan={3}>No pricing items found.</td>
                                    </tr>
                                ) : (
                                    pricing.map((p: any, idx: number) => (
                                        <tr key={p.id ?? idx}>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-semibold text-gray-900">{p.service_name ?? p.service_key ?? "—"}</div>
                                                <div className="text-xs text-gray-500">{p.service_key ?? ""}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-semibold text-gray-900">{p.plan_name ?? p.plan_key ?? "—"}</div>
                                                <div className="text-xs text-gray-500">{p.plan_key ?? ""}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm text-gray-700">
                                                {typeof p.price_inr === "number" ? p.price_inr.toLocaleString() : String(p.price_inr ?? "—")}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </motion.div>
                )}

        </AdminShell>
    );
}

function StatCard({ title, value }: { title: string; value: number | string }) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
            <dl>
                <dt className="text-sm font-semibold text-gray-600 truncate">{title}</dt>
                <dd className="mt-2 text-3xl font-bold text-gray-900">{value}</dd>
            </dl>
        </div>
    );
}
