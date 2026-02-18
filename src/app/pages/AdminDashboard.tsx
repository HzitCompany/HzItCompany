import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router"; 
import { useAuth } from "../auth/AuthProvider";
import { Seo } from "../components/Seo";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
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
  const { isAuthed, role, logout } = useAuth();
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
        const res = await fetchAdminOrders(); // existing fn
        setOrders(res.items);
      } else if (t === "submissions") {
        const res = await fetchAdminSubmissions(); // existing fn
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

  if (!isAuthed || role !== "admin") {
      return <div className="p-10 text-center">Access Denied</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Seo title="Admin Dashboard" description="HZ Company Admin" path="/admin" />

      {/* Top Bar */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">Logged in as Admin</span>
                <Button variant="outline" size="sm" onClick={() => logout()}>Logout</Button>
            </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
                {(["summary", "users", "orders", "submissions"] as Tab[]).map((t) => (
                    <button
                        key={t}
                        onClick={() => { setTab(t); setError(null); }}
                        className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                            tab === t
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </nav>
        </div>

        {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                <div className="flex">
                    <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                </div>
            </div>
        )}

        {/* Content */}
        {loading && <div className="text-gray-500 py-4">Loading...</div>}

        {!loading && tab === "summary" && stats && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Users" value={stats.totalUsers} />
                <StatCard title="Contact Submissions" value={stats.contactSubmissions} />
                <StatCard title="Hire Requests" value={stats.hireSubmissions} />
                <StatCard title="Career Applications" value={stats.careerApplications} />
            </div>
        )}

        {!loading && tab === "users" && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
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
                 <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
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
            </div>
        )}

        {!loading && tab === "submissions" && (
             <div className="bg-white shadow overflow-hidden sm:rounded-md">
                 <ul role="list" className="divide-y divide-gray-200">
                    {submissions.map((sub: any) => (
                        <li key={sub.id}>
                            <div className="px-4 py-4 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-blue-600 truncate">{sub.type}</p>
                                    <div className="ml-2 flex-shrink-0 flex">
                                        <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                            New
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-2 sm:flex sm:justify-between">
                                    <div className="sm:flex">
                                        <p className="flex items-center text-sm text-gray-500">
                                            {JSON.stringify(sub.data)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                 </ul>
             </div>
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
