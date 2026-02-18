import { useMemo, useRef, useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../auth/AuthProvider";
import { useAuthGuard } from "../auth/useAuthGuard";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navRef = useRef<HTMLElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  const navLinks = useMemo(
    () => [
      { name: "Home", path: "/" },
      { name: "About", path: "/about" },
      { name: "Services", path: "/services" },
      { name: "Portfolio", path: "/portfolio" },
      { name: "Contact", path: "/contact", protected: true },
      { name: "Careers", path: "/careers", protected: true },
    ],
    []
  );

  const activePath = location.pathname;

  const { user, isAuthed, logout } = useAuth();
  const { guardNavigate } = useAuthGuard();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    let lastScrolled = window.scrollY > 8;
    let lastY = window.scrollY;
    let lastHidden = false;
    setIsScrolled(lastScrolled);
    setIsHidden(false);

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const nextScrolled = y > 8;
        if (nextScrolled !== lastScrolled) {
          lastScrolled = nextScrolled;
          setIsScrolled(nextScrolled);
        }

        const delta = y - lastY;
        const isAtTop = y <= 8;

        const activeEl = document.activeElement;
        const isInteractingWithNav = !!(activeEl && navRef.current && navRef.current.contains(activeEl));

        // Hide on scroll down, show on scroll up. Keep visible at top, when menu is open, or when keyboard focus is in the navbar.
        let nextHidden = lastHidden;
        if (isAtTop || isMobileMenuOpen || isInteractingWithNav) {
          nextHidden = false;
        } else if (delta > 10 && y > 80) {
          nextHidden = true;
        } else if (delta < -10) {
          nextHidden = false;
        }

        if (nextHidden !== lastHidden) {
          lastHidden = nextHidden;
          setIsHidden(nextHidden);
        }

        lastY = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true } as AddEventListenerOptions);
    return () => window.removeEventListener("scroll", onScroll as any);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileOpen(false);
    window.requestAnimationFrame(() => setIsScrolled(window.scrollY > 8));
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileMenuOpen]);

  // Focus trap + outside click for mobile menu.
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const menuEl = mobileMenuRef.current;
    if (menuEl) {
      const focusables = menuEl.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"
      );
      focusables[0]?.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const container = mobileMenuRef.current;
      if (!container) return;

      const nodes = Array.from(
        container.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )
      ).filter((n) => !n.hasAttribute("disabled") && n.tabIndex !== -1);

      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <motion.nav
      ref={(el) => {
        navRef.current = el;
      }}
      initial={false}
      animate={{ y: isHidden ? -24 : 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 44, mass: 0.9 }}
      className="fixed top-4 inset-x-0 z-50 px-4"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-blue-700 focus:shadow"
      >
        Skip to content
      </a>

      <div className="mx-auto max-w-7xl">
        <div
          className={
            "rounded-2xl border transition-all duration-300 ease-out will-change-[backdrop-filter,background-color,box-shadow] " +
            (isScrolled
              ? "backdrop-blur-xl bg-white/85 border-white/30 shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
              : "backdrop-blur-md bg-white/55 border-white/20 shadow-none")
          }
        >
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20 md:h-24">
              {/* Logo */}
              <Link to="/" className="flex items-center group">
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-xl overflow-hidden shrink-0">
                  <img
                    src="/logo.png"
                    alt="HZ IT Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <span
                  className="ml-3 text-base sm:text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent font-poppins whitespace-nowrap"
                >
                  HZ IT Company
                </span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-8">
                {navLinks.map((link) =>
                  link.protected ? (
                    <button
                      key={link.path}
                      type="button"
                      onClick={() => guardNavigate(link.path)}
                      className={
                        "relative text-sm font-medium transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white/60 " +
                        (activePath === link.path
                          ? "text-blue-800"
                          : "text-gray-900/80 hover:text-blue-800")
                      }
                    >
                      {link.name}
                      {activePath === link.path && (
                        <motion.div
                          layoutId="navbar-indicator"
                          className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-blue-700"
                          transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.6 }}
                        />
                      )}
                    </button>
                  ) : (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={
                        "relative text-sm font-medium transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white/60 " +
                        (activePath === link.path
                          ? "text-blue-800"
                          : "text-gray-900/80 hover:text-blue-800")
                      }
                    >
                      {link.name}
                      {activePath === link.path && (
                        <motion.div
                          layoutId="navbar-indicator"
                          className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-blue-700"
                          transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.6 }}
                        />
                      )}
                    </Link>
                  )
                )}

                {isAuthed ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsProfileOpen((v) => !v)}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white/60 hover:bg-white/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white/60"
                      aria-label="Profile"
                    >
                      <span className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white inline-flex items-center justify-center font-bold">
                        {(user?.name?.trim()?.[0] ?? user?.email?.trim()?.[0] ?? "U").toUpperCase()}
                      </span>
                    </button>

                    <AnimatePresence>
                      {isProfileOpen ? (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.14 }}
                          className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden"
                        >
                          <div className="px-4 py-3 border-b border-gray-100">
                            <div className="text-sm font-semibold text-gray-900">{user?.name ?? "My Account"}</div>
                            <div className="text-xs text-gray-600 truncate">{user?.phone ?? user?.email ?? ""}</div>
                          </div>

                          <button
                            type="button"
                            className="w-full text-left px-4 py-3 text-sm text-gray-900 hover:bg-gray-50"
                            onClick={() => guardNavigate("/profile")}
                          >
                            My Profile
                          </button>
                          <button
                            type="button"
                            className="w-full text-left px-4 py-3 text-sm text-gray-900 hover:bg-gray-50"
                            onClick={() => guardNavigate("/submissions")}
                          >
                            My Submissions
                          </button>
                          <button
                            type="button"
                            className="w-full text-left px-4 py-3 text-sm text-rose-700 hover:bg-rose-50"
                            onClick={() => logout()}
                          >
                            Logout
                          </button>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                ) : null}

                <Link
                  to="#"
                  onClick={(e) => {
                    e.preventDefault();
                    guardNavigate("/hire-us");
                  }}
                  className="min-h-11 inline-flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-sm hover:shadow-lg hover:scale-[1.03] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white/60"
                >
                  Hire Us
                </Link>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Menu"
                className="md:hidden min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl transition-colors hover:bg-white/60 text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white/60"
              >
                <span className="sr-only">{isMobileMenuOpen ? "Close menu" : "Open menu"}</span>
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                key="mobile-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />

              <motion.div
                key="mobile-menu"
                ref={(el) => {
                  mobileMenuRef.current = el;
                }}
                role="dialog"
                aria-modal="true"
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 520, damping: 44, mass: 0.8 }}
                className="md:hidden mt-3 rounded-2xl bg-white/90 backdrop-blur-xl border border-white/30 shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden relative z-50"
              >
                <div className="px-5 py-5">
                  <div className="space-y-1">
                    {navLinks.map((link) => {
                      const isActive = activePath === link.path;
                      if (link.protected) {
                        return (
                          <button
                            key={link.path}
                            type="button"
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              guardNavigate(link.path);
                            }}
                            className={
                              "min-h-11 w-full px-3 rounded-xl flex items-center text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white/60 " +
                              (isActive
                                ? "bg-blue-50 text-blue-800"
                                : "text-gray-900 hover:bg-gray-50")
                            }
                          >
                            <span className="flex-1 text-left">{link.name}</span>
                            {isActive ? (
                              <motion.span
                                layoutId="mobile-active-dot"
                                className="h-2 w-2 rounded-full bg-blue-700"
                                transition={{ type: "spring", stiffness: 520, damping: 40, mass: 0.6 }}
                              />
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-transparent" />
                            )}
                          </button>
                        );
                      }
                      return (
                        <Link
                          key={link.path}
                          to={link.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={
                            "min-h-11 px-3 rounded-xl flex items-center text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white/60 " +
                            (isActive
                              ? "bg-blue-50 text-blue-800"
                              : "text-gray-900 hover:bg-gray-50")
                          }
                        >
                          <span className="flex-1">{link.name}</span>
                          {isActive ? (
                            <motion.span
                              layoutId="mobile-active-dot"
                              className="h-2 w-2 rounded-full bg-blue-700"
                              transition={{ type: "spring", stiffness: 520, damping: 40, mass: 0.6 }}
                            />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-transparent" />
                          )}
                        </Link>
                      );
                    })}
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        guardNavigate("/hire-us");
                      }}
                      className="min-h-11 w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-center shadow-sm hover:shadow-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white/60"
                    >
                      Hire Us
                    </button>
                  </div>

                  <button
                    type="button"
                    className="mt-3 min-h-11 w-full inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-900 text-sm font-semibold hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}