import { Outlet, useLocation } from "react-router";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { ScrollToTop } from "./ScrollToTop";
import { FloatingWhatsApp } from "./FloatingWhatsApp";
import { InstagramBrowserBanner } from "./InstagramBrowserBanner";
import { AuthProvider } from "../auth/AuthProvider";
import { AuthModal } from "./AuthModal";
import { AnimatePresence } from "motion/react";
import { PageTransition } from "./PageTransition";
import { useEffect } from "react";
import { getJson } from "../services/apiClient";

export function Layout() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
    // Warm up the backend (Render cold starts) so user actions like submit feel faster.
    // Non-blocking and safe even if the server returns 503 while starting.
    getJson("/api/health").catch(() => undefined);
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col font-inter overflow-x-hidden">
        {isAdminRoute ? null : (
          <header>
            <Navbar />
          </header>
        )}
        <main className="flex-1" id="main-content">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
        {isAdminRoute ? null : <Footer />}
        <ScrollToTop />
        {isAdminRoute ? null : <FloatingWhatsApp />}
        <AuthModal />
        <InstagramBrowserBanner />
      </div>
    </AuthProvider>
  );
}