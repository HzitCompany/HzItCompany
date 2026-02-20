import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { Seo } from "../components/Seo";
import { useAuth } from "../auth/AuthProvider";
import { fetchPortalOrders } from "../services/platformService";
import { CmsSlot } from "../components/cms/CmsBlocks";

export function PortalDashboard() {
  const { isAuthed, role, logout, user } = useAuth();

  type PortalOrderItem = {
    id: number;
    service_name: string;
    plan_name: string;
    price_inr: number | string;
    payment_status: string;
    project_status: string;
  };

  const [items, setItems] = useState<PortalOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems([]);
    setError(null);

    if (!isAuthed) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    fetchPortalOrders()
      .then((r: any) => {
        if (!mounted) return;
        setItems(r.items);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load orders");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isAuthed, user?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((x) => JSON.stringify(x).toLowerCase().includes(q));
  }, [items, query]);

  async function downloadInvoice(orderId: number) {
    if (!isAuthed) return;
    const response = await fetch(`/api/invoice/${orderId}`, {
      credentials: "include",
    });

    if (!response.ok) {
      setError(`Invoice download failed (${response.status})`);
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-10">
            <h1 className="text-2xl font-bold text-gray-900">Please login</h1>
            <p className="mt-2 text-gray-600">You need an account to view orders and invoices.</p>
            <Link to="/portal/login" className="mt-6 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              Go to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (role === "admin") {
    location.href = "/admin";
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Seo title="Client Portal" description="View your orders, status, and invoices." path="/portal" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-poppins">
              Client Portal
            </h1>
            <p className="mt-2 text-gray-600">Track your orders and download invoices.</p>
          </div>
          <button onClick={logout} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50">
            Logout
          </button>
        </div>

        <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <input
              className="w-full sm:max-w-sm rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Search orders…"
              value={query}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            />
            <Link to="/services" className="text-sm text-blue-700 hover:underline">
              Order another service
            </Link>
          </div>

          {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div> : null}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-600">
                <tr>
                  <th className="py-2">Order</th>
                  <th className="py-2">Service</th>
                  <th className="py-2">Plan</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Payment</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="py-3 text-gray-600" colSpan={7}>
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="py-3 text-gray-600" colSpan={7}>
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((o) => (
                    <tr key={o.id} className="border-t border-gray-100">
                      <td className="py-3 font-medium text-gray-900">#{o.id}</td>
                      <td className="py-3 text-gray-800">{o.service_name}</td>
                      <td className="py-3 text-gray-800">{o.plan_name}</td>
                      <td className="py-3 text-gray-800">₹{Number(o.price_inr).toLocaleString("en-IN")}</td>
                      <td className="py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs ${o.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                          {o.payment_status}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex rounded-full bg-blue-50 text-blue-700 px-2 py-1 text-xs">{o.project_status}</span>
                      </td>
                      <td className="py-3">
                        {o.payment_status === "paid" ? (
                          <button className="text-blue-700 hover:underline" onClick={() => downloadInvoice(o.id)}>
                            Download
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            Note: invoice download requires an authenticated session.
          </p>
        </div>
      </div>

      {/* Admin-managed page blocks */}
      <CmsSlot contentKey="page.portal" />
    </div>
  );
}
