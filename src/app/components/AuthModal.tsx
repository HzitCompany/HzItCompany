import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import { requestOtp, verifyOtp } from "../services/otpService";
import { useAuth } from "../auth/AuthProvider";

type Step = "phone" | "otp";

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, onOtpVerified } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

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
      setStep("phone");
      setPhone("");
      setEmail("");
      setOtp("");
      setLoading(false);
      setError(null);
      setDebugOtp(null);
    }
  }, [isAuthModalOpen]);

  const canSend = useMemo(() => phone.trim().length >= 8 && email.trim().length >= 6 && !loading, [phone, email, loading]);
  const canVerify = useMemo(() => /^\d{6}$/.test(otp.trim()) && !loading, [otp, loading]);

  async function send() {
    if (!canSend) return;
    setError(null);
    setDebugOtp(null);
    setLoading(true);

    try {
      const r = await requestOtp({ phone: phone.trim(), email: email.trim(), name: undefined });
      if (r.debugOtp) setDebugOtp(r.debugOtp);
      setStep("otp");
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
      const r = await verifyOtp({ phone: phone.trim(), otp: otp.trim() });
      await onOtpVerified(r.token);
    } catch (e: any) {
      setError(typeof e?.message === "string" ? e.message : "OTP verification failed");
    } finally {
      setLoading(false);
    }
  }

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
              <p className="mt-2 text-sm text-gray-600">Verify your phone number to continue.</p>

              {error ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900 text-sm">
                  {error}
                </div>
              ) : null}

              {debugOtp ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm">
                  <div className="font-semibold">Dev OTP</div>
                  <div className="mt-1">{debugOtp}</div>
                </div>
              ) : null}

              {step === "phone" ? (
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

                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">Phone</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+91 8101515185"
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
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  <div className="text-sm text-gray-600">
                    OTP sent to <span className="font-semibold text-gray-900">{phone.trim() || "—"}</span>
                  </div>
                  <div className="text-sm text-gray-600">Email on file: <span className="font-semibold text-gray-900">{email.trim() || "—"}</span></div>

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
                        setStep("phone");
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
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
