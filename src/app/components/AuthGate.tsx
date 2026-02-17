import { useEffect } from "react";
import { useAuth } from "../auth/AuthProvider";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthed, openAuthModal } = useAuth();

  useEffect(() => {
    if (isAuthed) return;
    openAuthModal();
  }, [isAuthed, openAuthModal]);

  return <>{children}</>;
}
