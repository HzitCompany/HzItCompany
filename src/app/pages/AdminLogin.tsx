import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { motion } from "framer-motion";
import { Seo } from "../components/Seo";
import { GoogleLoginButton } from "../components/GoogleLoginButton";
import { useAuth } from "../auth/AuthProvider";
import { requestEmailOtp, verifyEmailOtp } from "../services/otpService";

function getErrorMessage(err: unknown) {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const anyErr = err as any;
    if (typeof anyErr.message === "string" && anyErr.message.trim()) return anyErr.message;
  }
  return "Login failed";
}

type Step = "email" | "otp";

export function AdminLogin() {
  const navigate = useNavigate();
  const { onOtpVerified, onGoogleLogin } = useAuth();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("hzitcompany@gmail.com");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldownSec, setCooldownSec] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCooldown(seconds = 60) {
    setCooldownSec(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldownSec((s) => {
        if (s <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  async function onSendOtp() {
    if (loading || cooldownSec > 0) return;
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await requestEmailOtp({ email: email.trim().toLowerCase() });
      setStep("otp");
      setInfo("OTP sent! Check your email.");
      startCooldown(60);
    } catch (e) {
      setError(getErrorMessage(e));
      startCooldown(30);
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp() {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await verifyEmailOtp({ email: email.trim().toLowerCase(), token: otp.trim() });
      await onOtpVerified();
      navigate("/admin");
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Seo title="Admin Login" description="Admin access for HZ IT Company." path="/admin/login" />

      <section className="relative pt-32 pb-16 bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 font-poppins">Admin</h1>
            <p className="text-lg text-gray-300">Secure email OTP access.</p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/40 p-6 sm:p-10 shadow-xl">
              <h2 className="text-3xl font-bold text-gray-900 font-poppins">Admin Login</h2>
              <p className="mt-2 text-gray-600">Sign in with email OTP or Google.</p>

              <div className="mt-6 grid gap-4">
                {step === "email" ? (
                  <>
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">Admin Email</span>
                      <input
                        type="email"
                        className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        inputMode="email"
                      />
                    </label>

                    {info ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 text-sm">{info}</div> : null}
                    {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900 text-sm">{error}</div> : null}

                    <button
                      type="button"
                      disabled={loading || cooldownSec > 0}
                      onClick={onSendOtp}
                      className="min-h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                    >
                      {loading ? "Sending…" : cooldownSec > 0 ? `Wait ${cooldownSec}s` : "Send OTP"}
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">OTP sent to</p>
                      <p className="font-semibold text-gray-900">{email}</p>
                    </div>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">6-digit OTP</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="123456"
                        className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none text-center text-xl tracking-widest transition-all focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      />
                    </label>

                    {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900 text-sm">{error}</div> : null}

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => { setStep("email"); setError(null); setOtp(""); }}
                        className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        Change email
                      </button>
                      <button
                        type="button"
                        disabled={loading || otp.length < 6}
                        onClick={onVerifyOtp}
                        className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                      >
                        {loading ? "Verifying\u2026" : "Verify"}
                      </button>
                    </div>
                  </>
                )}

                <div className="relative flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 uppercase tracking-wide">or</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="flex justify-center">
                  <GoogleLoginButton
                    width={300}
                    onSuccess={() => navigate("/admin")}
                    onError={(msg) => setError(msg)}
                  />
                </div>

                <Link to="/" className="text-center text-sm text-gray-600 hover:underline">
                  Back to website
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
