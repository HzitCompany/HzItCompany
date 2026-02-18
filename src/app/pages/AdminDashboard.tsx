import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useLocation, useNavigate } from "react-router"; 
import { useAuth } from "../auth/AuthProvider";
import { Seo } from "../components/Seo";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Navbar } from "../components/Navbar";
import {
  fetchAdminPortalStats,
  fetchAdminUsers,
  updateUserRole,
  fetchAdminOrders,
  fetchAdminPricing,
  fetchAdminSubmissions,
} from "../services/platformService";

type Tab = "summary" | "users" | "orders" | "pricing" | "submissions";

export function AdminDashboard({ initialTab = "summary" }: { initialTab?: string }) {
    const { isAuthed, role, user, logout } = useAuth();
    const navigate = useNavigate();
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
    

        // Only allow admin email
        if (!isAuthed || role !== "admin" || user?.email !== "hzitcompany@gmail.com") {
                return <div className="p-10 text-center">Access Denied</div>;
        }

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

    // Only allow admin email
    if (!isAuthed || role !== "admin" || user?.email !== "hzitcompany@gmail.com") {
        return <div className="p-10 text-center">Access Denied</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 flex flex-col">
            <Navbar />
            <Seo title="Admin Dashboard" description="HZ Company Admin" path="/admin" />

            {/* Gradient Hero Section */}
            <section className="relative pt-24 md:pt-28 pb-8">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
                >
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white leading-tight font-poppins">
                        Admin Dashboard
                    </h1>
                    <p className="text-lg text-blue-100 mb-2">Welcome, {user?.full_name || "Admin"}!</p>
                </motion.div>
            </section>

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                {/* Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="border-b border-white/20 mb-8"
                >
                    <nav className="-mb-px flex space-x-8 justify-center">
                        {(["summary", "users", "orders", "submissions"] as Tab[]).map((t) => (
                            <button
                                key={t}
                                onClick={() => { setTab(t); setError(null); }}
                                className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-lg transition-all duration-200 ${
                                    tab === t
                                        ? "border-blue-400 text-blue-200"
                                        : "border-transparent text-blue-100 hover:text-white hover:border-blue-200"
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
                {loading && <div className="text-blue-100 py-4">Loading...</div>}

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
                        className="bg-white/80 shadow-lg overflow-hidden rounded-xl"
                    >
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((u) => (
                                    <tr key={u.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <img className="h-10 w-10 rounded-full bg-gray-100" src={u.avatar_url || "https://www.gravatar.com/avatar?d=mp"} alt="" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{u.full_name || "Unknown"}</div>
                                                    <div className="text-sm text-gray-500">{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(u.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {u.role === "admin" ? (
                                                <button onClick={() => promoteUser(u.id, "user")} className="text-amber-600 hover:text-amber-900">Demote</button>
                                            ) : (
                                                <button onClick={() => promoteUser(u.id, "admin")} className="text-indigo-600 hover:text-indigo-900">Promote</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {/* Simple Pagination */}
                        <div className="bg-white/80 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
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
                            <div key={sub.id} className="bg-white/80 rounded-xl shadow-lg p-6 flex flex-col gap-2">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-blue-700 font-semibold text-sm uppercase tracking-wide">{sub.type}</span>
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">New</span>
                                </div>
                                <div className="text-gray-700 text-sm">
                                    {Object.entries(sub.data || {}).map(([key, value]) => (
                                        <div key={key} className="mb-1">
                                            <span className="font-semibold capitalize">{key}:</span> {String(value)}
                                        </div>
                                    ))}
                                </div>
                                <div className="text-xs text-gray-400 mt-2">ID: {sub.id}</div>
                            </div>
                        ))}
                    </motion.div>
                )}

            </main>
        </div>
    );
}

function StatCard({ title, value }: { title: string; value: number | string }) {
    return (
        <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
                                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{value}</dd>
                                </dl>
            </div>
        </div>
    );
}
