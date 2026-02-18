import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";

import { useAuth } from "../../auth/AuthProvider";

type AdminNavItem = { label: string; to: string };

function getAdminEmail(): string {
  const envAny = (import.meta as any).env ?? {};
  return ((envAny.VITE_ADMIN_EMAIL as string | undefined) ?? "hzitcompany@gmail.com")
    .trim()
    .toLowerCase();
}

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: AdminNavItem[] = useMemo(
    () => [
      { label: "Overview", to: "/admin/dashboard" },
      { label: "Users", to: "/admin/users" },
      { label: "Submissions", to: "/admin/submissions" },
      { label: "Orders", to: "/admin/orders" },
      { label: "Pricing", to: "/admin/pricing" },
      { label: "Careers", to: "/admin/careers" },
      { label: "Content", to: "/admin/content" },
    ],
    []
  );

  const activePath = location.pathname;
  const adminEmail = getAdminEmail();
  const displayEmail = (user?.email ?? "").trim().toLowerCase();
  const subtitle = displayEmail === adminEmail ? displayEmail : "Admin";

  const Nav = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="mt-4 grid gap-1">
      {navItems.map((item) => {
        const isActive = activePath === item.to || (item.to === "/admin/dashboard" && activePath === "/admin");
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={
              "min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 " +
              (isActive
                ? "bg-blue-50 text-blue-900"
                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 font-inter overflow-x-hidden">
      <div className="flex min-h-screen">
        <aside className="hidden lg:block w-72 shrink-0 p-4">
          <div className="h-full rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl overflow-hidden bg-gray-50 border border-gray-200">
                <img src="/logo.png" alt="HZ IT Logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="text-base font-bold font-poppins">Admin</div>
                <div className="text-xs text-gray-500 truncate max-w-[11rem]">{subtitle}</div>
              </div>
            </div>

            <Nav />

            <button
              type="button"
              onClick={() => logout()}
              className="mt-6 w-full min-h-11 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold"
            >
              Logout
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-20 border-b border-blue-900/10 bg-gradient-to-r from-blue-700 to-blue-900 text-white">
            <div className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="lg:hidden min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/10 hover:bg-white/15"
                  aria-label="Open admin menu"
                >
                  <span className="text-lg font-bold">≡</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    // Try to go back; if there is no meaningful history, fall back to admin dashboard.
                    try {
                      if (window.history.length > 1) navigate(-1);
                      else navigate("/admin/dashboard");
                    } catch {
                      navigate("/admin/dashboard");
                    }
                  }}
                  className="min-h-11 rounded-xl border border-white/25 bg-white/10 hover:bg-white/15 px-4 text-sm font-semibold"
                >
                  Back
                </button>

                <div className="min-w-0">
                  <div className="text-sm text-white/80">HZ IT Company</div>
                  <div className="text-lg font-bold font-poppins truncate">{title}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-sm text-white/80 truncate max-w-[16rem]">{subtitle}</div>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="min-h-11 rounded-xl border border-white/25 bg-white/10 hover:bg-white/15 px-4 text-sm font-semibold"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          <main className="px-4 sm:px-6 lg:px-8 py-6 bg-white">
            {children}
          </main>

          <footer className="border-t border-blue-900/10 bg-gradient-to-r from-blue-700 to-blue-900 text-white">
            <div className="px-4 sm:px-6 lg:px-8 py-4 text-sm text-white/85">
              Admin Portal
            </div>
          </footer>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              key="admin-mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden"
              onClick={() => setMobileOpen(false)}
            />

            <motion.aside
              key="admin-mobile-drawer"
              initial={{ x: -18, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -18, opacity: 0 }}
              transition={{ type: "spring", stiffness: 520, damping: 44, mass: 0.8 }}
              className="fixed inset-y-0 left-0 z-50 w-72 p-4 lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Admin menu"
            >
              <div className="h-full rounded-2xl bg-white border border-gray-200 shadow-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-2xl overflow-hidden bg-gray-50 border border-gray-200">
                      <img src="/logo.png" alt="HZ IT Logo" className="h-full w-full object-contain" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-base font-bold font-poppins">Admin</div>
                      <div className="text-xs text-gray-500 truncate">{subtitle}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50"
                    aria-label="Close admin menu"
                  >
                    <span className="text-lg font-bold text-gray-900">×</span>
                  </button>
                </div>

                <Nav onNavigate={() => setMobileOpen(false)} />

                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="mt-6 w-full min-h-11 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold"
                >
                  Logout
                </button>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
