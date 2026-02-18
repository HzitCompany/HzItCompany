import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useAuth } from "../auth/AuthProvider";
import { Seo } from "../components/Seo";
import { Button } from "../components/ui/button";
import { AdminShell } from "../components/admin/AdminShell";
import {
  fetchAdminPortalStats,
  fetchAdminUsers,
  updateUserRole,
  fetchAdminOrders,
  fetchAdminSubmissions,
} from "../services/platformService";

type Tab = "summary" | "users" | "orders" | "pricing" | "submissions";

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
    
    // Pagination / Search
    const [userPage, setUserPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);

    useEffect(() => {
        if (!isAuthed || role !== "admin") return;
        loadTab(tab);
    }, [tab, isAuthed, role, userPage]);
    

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
                                const res = await fetchAdminOrders();
                                setOrders(res.items);
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

    return (
        <AdminShell title="Dashboard">
            <Seo title="Admin Dashboard" description="HZ Company Admin" path="/admin" />

            <div className="mb-6">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg p-6"
                >
                    <div className="text-sm text-white/70">Welcome</div>
                    <div className="text-2xl md:text-3xl font-bold font-poppins">{user?.full_name || "Admin"}</div>
                    <div className="mt-1 text-sm text-white/70">Manage users, submissions, pricing and orders.</div>
                </motion.div>
            </div>

                {/* Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="border-b border-white/15 mb-8"
                >
                    <nav className="-mb-px flex space-x-8 justify-center">
                        {(["summary", "users", "orders", "submissions"] as Tab[]).map((t) => (
                            <button
                                key={t}
                                onClick={() => { setTab(t); setError(null); }}
                                className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-lg transition-all duration-200 ${
                                    tab === t
                                        ? "border-white/60 text-white"
                                        : "border-transparent text-white/70 hover:text-white hover:border-white/30"
                                }`}
                            >
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </nav>
                </motion.div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-red-50 border-l-4 border-red-400 p-4 mb-6"
                    >
                        <div className="flex">
                            <div className="ml-3">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Content */}
                {loading && <div className="text-white/70 py-4">Loading...</div>}

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
                        className="bg-white/5 border border-white/10 shadow-lg overflow-hidden rounded-2xl"
                    >
                        <table className="min-w-full divide-y divide-white/10">
                            <thead className="bg-white/5">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">User</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Role</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Joined</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-white/70 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {users.map((u) => (
                                    <tr key={u.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <img className="h-10 w-10 rounded-full bg-white/10" src={u.avatar_url || "https://www.gravatar.com/avatar?d=mp"} alt="" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-semibold text-white">{u.full_name || "Unknown"}</div>
                                                    <div className="text-sm text-white/70">{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-white/10 text-white">
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                                            {new Date(u.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {u.role === "admin" ? (
                                                <button onClick={() => promoteUser(u.id, "user")} className="text-white/80 hover:text-white underline">Demote</button>
                                            ) : (
                                                <button onClick={() => promoteUser(u.id, "admin")} className="text-white/80 hover:text-white underline">Promote</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {/* Simple Pagination */}
                        <div className="bg-white/5 px-4 py-3 flex items-center justify-between border-t border-white/10 sm:px-6">
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
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {submissions.map((sub: any) => (
                            <div key={sub.id} className="rounded-2xl bg-white/5 border border-white/10 shadow-lg p-6 flex flex-col gap-2">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-white font-semibold text-sm uppercase tracking-wide">{sub.type}</span>
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-white/10 text-white">New</span>
                                </div>
                                <div className="text-white/80 text-sm">
                                    {Object.entries(sub.data || {}).map(([key, value]) => (
                                        <div key={key} className="mb-1">
                                            <span className="font-semibold capitalize">{key}:</span> {String(value)}
                                        </div>
                                    ))}
                                </div>
                                <div className="text-xs text-white/50 mt-2">ID: {sub.id}</div>
                            </div>
                        ))}
                    </motion.div>
                )}

        </AdminShell>
    );
}

function StatCard({ title, value }: { title: string; value: number | string }) {
    return (
        <div className="rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg p-6">
            <dl>
                <dt className="text-sm font-semibold text-white/70 truncate">{title}</dt>
                <dd className="mt-2 text-3xl font-bold text-white">{value}</dd>
            </dl>
        </div>
    );
}
