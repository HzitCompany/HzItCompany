import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import { requestEmailOtp, verifyEmailOtp } from "../services/otpService";
import { useAuth } from "../auth/AuthProvider";
import { GoogleLoginButton } from "./GoogleLoginButton";

type Step = "email" | "otp";

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, onOtpVerified } = useAuth();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<number>(0);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!isAuthModalOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAuthModal();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isAuthModalOpen, closeAuthModal]);

  useEffect(() => {
    if (!isAuthModalOpen) {
      setStep("email");
      setEmail("");
      setOtp("");
      setLoading(false);
      setError(null);
      setResendAvailableAt(0);
    }
  }, [isAuthModalOpen]);

  useEffect(() => {
    if (!isAuthModalOpen) return;
    if (step !== "otp") return;
    const t = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [isAuthModalOpen, step]);

  const canSend = useMemo(() => email.trim().length >= 6 && !loading, [email, loading]);
  const canVerify = useMemo(() => /^\d{6}$/.test(otp.trim()) && !loading, [otp, loading]);

  async function send() {
    if (!canSend) return;
    setError(null);
    setLoading(true);

    try {
      await requestEmailOtp({ email: email.trim() });
      setStep("otp");
      setResendAvailableAt(Date.now() + 30_000);
    } catch (e: any) {
      setError(typeof e?.message === "string" ? e.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    if (!canVerify) return;
    setError(null);
    setLoading(true);

    try {
      await verifyEmailOtp({ email: email.trim(), token: otp.trim() });
      await onOtpVerified();
    } catch (e: any) {
      setError(typeof e?.message === "string" ? e.message : "OTP verification failed");
    } finally {
      setLoading(false);
    }
  }

  const resendSecondsLeft = useMemo(() => {
    const ms = resendAvailableAt - nowMs;
    if (ms <= 0) return 0;
    return Math.ceil(ms / 1000);
  }, [resendAvailableAt, nowMs]);

  return (
    <AnimatePresence>
      {isAuthModalOpen ? (
        <motion.div
          key="auth-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAuthModal();
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="min-h-full flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-gray-900 font-poppins">Verify with OTP</h2>
              <p className="mt-2 text-sm text-gray-600">Verify your email to continue.</p>

              {error ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900 text-sm">
                  {error}
                </div>
              ) : null}

              {step === "email" ? (
                <div className="mt-6 grid gap-4">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">Email</span>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={send}
                    disabled={!canSend}
                    className={
                      "w-full rounded-xl px-4 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg transition-all " +
                      (!canSend ? "opacity-70 cursor-not-allowed" : "hover:shadow-xl")
                    }
                  >
                    {loading ? "Sending…" : "Send OTP"}
                  </button>

                  <button
                    type="button"
                    onClick={closeAuthModal}
                    className="w-full rounded-xl px-4 py-3 font-semibold border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                  >
                    Continue as guest
                  </button>

                  <div className="flex justify-center">
                    <GoogleLoginButton
                      width={320}
                      onSuccess={closeAuthModal}
                      onError={(msg) => setError(msg)}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  <div className="text-sm text-gray-600">
                    OTP sent to <span className="font-semibold text-gray-900">{email.trim() || "—"}</span>
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">OTP (6 digits)</span>
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      maxLength={6}
                      className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none tracking-widest focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("email");
                        setOtp("");
                        setError(null);
                      }}
                      disabled={loading}
                      className={
                        "rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-900 hover:bg-gray-50 " +
                        (loading ? "opacity-70 cursor-not-allowed" : "")
                      }
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={verify}
                      disabled={!canVerify}
                      className={
                        "rounded-xl px-4 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg transition-all " +
                        (!canVerify ? "opacity-70 cursor-not-allowed" : "hover:shadow-xl")
                      }
                    >
                      {loading ? "Verifying…" : "Verify"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={send}
                    disabled={loading || resendSecondsLeft > 0}
                    className={
                      "w-full rounded-xl px-4 py-3 font-semibold border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 " +
                      (loading || resendSecondsLeft > 0 ? "opacity-70 cursor-not-allowed" : "")
                    }
                  >
                    {resendSecondsLeft > 0 ? `Resend in ${resendSecondsLeft}s` : "Resend OTP"}
                  </button>

                  <button
                    type="button"
                    onClick={closeAuthModal}
                    className="w-full rounded-xl px-4 py-3 font-semibold border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                  >
                    Continue as guest
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
