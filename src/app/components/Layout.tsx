import { Outlet, useLocation } from "react-router";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { ScrollToTop } from "./ScrollToTop";
import { FloatingWhatsApp } from "./FloatingWhatsApp";
import { AuthProvider } from "../auth/AuthProvider";
import { AuthModal } from "./AuthModal";
import { AnimatePresence } from "motion/react";
import { PageTransition } from "./PageTransition";

export function Layout() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

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
      </div>
    </AuthProvider>
  );
}