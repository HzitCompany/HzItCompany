import type { ReactNode } from "react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router";

import { useAuth } from "./AuthProvider";
import { CTAButton } from "../components/CTAButton";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isAuthed, role, isLoading, openAuthModal, logout } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthed) return;
    openAuthModal({ afterAuthNavigateTo: location.pathname });
  }, [isLoading, isAuthed, location.pathname, openAuthModal]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
        Checking access…
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="min-h-[70vh] bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-3xl border border-gray-200 p-8 md:p-10 shadow-xl">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-poppins">Admin access</h1>
            <p className="mt-2 text-gray-600">Please sign in to continue.</p>
            <div className="mt-6">
              <CTAButton onClick={() => openAuthModal({ afterAuthNavigateTo: location.pathname })}>Sign in</CTAButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="min-h-[70vh] bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-3xl border border-gray-200 p-8 md:p-10 shadow-xl">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-poppins">Forbidden</h1>
            <p className="mt-2 text-gray-600">
              Your account does not have admin access. If you believe this is an error, contact the site owner.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <CTAButton onClick={logout}>Sign out</CTAButton>
              <Link
                className="px-5 py-3 rounded-xl border border-gray-300 font-semibold text-gray-900 hover:bg-gray-50"
                to="/"
              >
                Back to website
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

