import type { ReactNode } from "react";
import { useEffect } from "react";
import { useLocation } from "react-router";

import { useAuth } from "./AuthProvider";
import { CTAButton } from "../components/CTAButton";

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isAuthed, openAuthModal } = useAuth();

  useEffect(() => {
    if (isAuthed) return;
    openAuthModal({ afterAuthNavigateTo: location.pathname });
  }, [isAuthed, location.pathname, openAuthModal]);

  if (isAuthed) return <>{children}</>;

  return (
    <div className="min-h-[70vh] bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-3xl border border-gray-200 p-8 md:p-10 shadow-xl">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-poppins">Verify to continue</h1>
          <p className="mt-2 text-gray-600">
            Please verify your phone and email to access this page.
          </p>
          <div className="mt-6">
            <CTAButton onClick={() => openAuthModal({ afterAuthNavigateTo: location.pathname })}>
              Verify now
            </CTAButton>
          </div>
        </div>
      </div>
    </div>
  );
}
