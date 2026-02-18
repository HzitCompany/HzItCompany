import { useEffect, useId, useRef, useState } from "react";

import { loginWithGoogle } from "../services/otpService";
import { useAuth } from "../auth/AuthProvider";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: string;
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GIS_SCRIPT_ID = "google-identity-services";

function loadGIS(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    if (document.getElementById(GIS_SCRIPT_ID)) {
      // Script already added; wait for it.
      const check = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(check);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(check);
        reject(new Error("GIS timed out"));
      }, 10000);
      return;
    }
    const script = document.createElement("script");
    script.id = GIS_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load GIS"));
    document.head.appendChild(script);
  });
}

type GoogleLoginButtonProps = {
  onSuccess?: () => void;
  onError?: (message: string) => void;
  className?: string;
  /** Width in px. Defaults to 280. */
  width?: number;
  theme?: "outline" | "filled_blue";
};

export function GoogleLoginButton({
  onSuccess,
  onError,
  width = 280,
  theme = "outline"
}: GoogleLoginButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [gisReady, setGisReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const holderId = useId();

  const { onGoogleLogin } = useAuth();

  const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId) return;
    loadGIS()
      .then(() => setGisReady(true))
      .catch((e) => {
        const msg = e?.message ?? "Failed to load Google login";
        setError(msg);
        onError?.(msg);
      });
  }, [clientId, onError]);

  useEffect(() => {
    if (!gisReady || !buttonRef.current || !clientId) return;

    window.google!.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        setError(null);
        try {
          await loginWithGoogle({ credential: response.credential });
          await onGoogleLogin();
          onSuccess?.();
        } catch (e: any) {
          const msg = typeof e?.message === "string" ? e.message : "Google login failed";
          setError(msg);
          onError?.(msg);
        }
      }
    });

    window.google!.accounts.id.renderButton(buttonRef.current, {
      type: "standard",
      theme,
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width
    });
  }, [gisReady, clientId, theme, width, onGoogleLogin, onSuccess, onError]);

  if (!clientId) {
    // VITE_GOOGLE_CLIENT_ID not set – hide button gracefully.
    return null;
  }

  return (
    <div>
      <div ref={buttonRef} id={holderId} />
      {error ? (
        <p className="mt-2 text-sm text-rose-700">{error}</p>
      ) : null}
    </div>
  );
}
