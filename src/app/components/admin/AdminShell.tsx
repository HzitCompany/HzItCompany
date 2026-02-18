import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
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
              "min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/25 " +
              (isActive
                ? "bg-white/10 text-white"
                : "text-white/80 hover:bg-white/5 hover:text-white")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 text-white font-inter overflow-x-hidden">
      <div className="flex min-h-screen">
        <aside className="hidden lg:block w-72 shrink-0 p-4">
          <div className="h-full rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl overflow-hidden bg-white/10">
                <img src="/logo.png" alt="HZ IT Logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="text-base font-bold font-poppins">Admin</div>
                <div className="text-xs text-white/70 truncate max-w-[11rem]">{subtitle}</div>
              </div>
            </div>

            <Nav />

            <button
              type="button"
              onClick={() => logout()}
              className="mt-6 w-full min-h-11 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-sm font-semibold"
            >
              Logout
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-white/5 backdrop-blur-xl">
            <div className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="lg:hidden min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 hover:bg-white/15"
                  aria-label="Open admin menu"
                >
                  <span className="text-lg font-bold">≡</span>
                </button>
                <div className="min-w-0">
                  <div className="text-sm text-white/70">HZ IT Company</div>
                  <div className="text-lg font-bold font-poppins truncate">{title}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-sm text-white/70 truncate max-w-[16rem]">{subtitle}</div>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="min-h-11 rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 px-4 text-sm font-semibold"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          <main className="px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
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
              <div className="h-full rounded-2xl bg-neutral-950/70 backdrop-blur-xl border border-white/10 shadow-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-2xl overflow-hidden bg-white/10">
                      <img src="/logo.png" alt="HZ IT Logo" className="h-full w-full object-contain" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-base font-bold font-poppins">Admin</div>
                      <div className="text-xs text-white/70 truncate">{subtitle}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 hover:bg-white/15"
                    aria-label="Close admin menu"
                  >
                    <span className="text-lg font-bold">×</span>
                  </button>
                </div>

                <Nav onNavigate={() => setMobileOpen(false)} />

                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="mt-6 w-full min-h-11 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-sm font-semibold"
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
