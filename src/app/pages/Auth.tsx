import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Seo } from "../components/Seo";
import { requestEmailOtp, verifyEmailOtp } from "../services/otpService";
import { useAuth } from "../auth/AuthProvider";
import { GoogleLoginButton } from "../components/GoogleLoginButton";

const requestSchema = z
  .object({
    email: z.string().email("Enter a valid email").max(254),
  })
  .strict();

type RequestValues = z.infer<typeof requestSchema>;

const verifySchema = z
  .object({
    token: z.string().regex(/^\d{6}$/, "Enter the 6-digit OTP"),
  })
  .strict();

type VerifyValues = z.infer<typeof verifySchema>;

type Step = "request" | "verify";

export function Auth() {
  const navigate = useNavigate();
  const { onOtpVerified, onGoogleLogin } = useAuth();

  const [step, setStep] = useState<Step>("request");
  const [emailForVerify, setEmailForVerify] = useState<string>("");

  const [status, setStatus] = useState<{ kind: "idle" | "success" | "error"; message?: string }>({ kind: "idle" });
  const [resendAvailableAt, setResendAvailableAt] = useState<number>(0);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (step !== "verify") return;
    const t = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [step]);

  const {
    register: registerRequest,
    handleSubmit: handleSubmitRequest,
    getValues,
    formState: { errors: requestErrors, isSubmitting: requestSubmitting },
  } = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: "" },
    mode: "onTouched",
  });

  const {
    register: registerVerify,
    handleSubmit: handleSubmitVerify,
    formState: { errors: verifyErrors, isSubmitting: verifySubmitting },
  } = useForm<VerifyValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { token: "" },
    mode: "onTouched",
  });

  const loading = requestSubmitting || verifySubmitting;

  const header = useMemo(() => (step === "request" ? "Sign in with Email OTP" : "Verify OTP"), [step]);

  async function onRequest(values: RequestValues) {
    setStatus({ kind: "idle" });
    const email = values.email.trim();

    try {
      await requestEmailOtp({ email });
      setEmailForVerify(email);
      setStep("verify");
      setResendAvailableAt(Date.now() + 30_000);
      setStatus({ kind: "success", message: "OTP sent! Check your inbox (and spam)." });
    } catch (e: any) {
      const statusCode = typeof e?.status === "number" ? e.status : undefined;
      const msg =
        statusCode === 429
          ? "Too many OTP requests. Please wait and try again."
          : typeof e?.message === "string"
            ? e.message
            : "Failed to send OTP";
      setStatus({ kind: "error", message: msg });
    }
  }

  async function onResend() {
    const email = emailForVerify || getValues("email");
    if (!email || Date.now() < resendAvailableAt) return;
    setStatus({ kind: "idle" });

    try {
      await requestEmailOtp({ email });
      setResendAvailableAt(Date.now() + 30_000);
      setStatus({ kind: "success", message: "OTP resent. Please check your email." });
    } catch (e: any) {
      const statusCode = typeof e?.status === "number" ? e.status : undefined;
      const msg =
        statusCode === 429
          ? "Too many OTP requests. Please wait and try again."
          : typeof e?.message === "string"
            ? e.message
            : "Failed to resend OTP";
      setStatus({ kind: "error", message: msg });
    }
  }

  async function onVerify(values: VerifyValues) {
    setStatus({ kind: "idle" });

    try {
      // Cookie is set by backend; we just trigger a refreshMe.
      await verifyEmailOtp({ email: emailForVerify, token: values.token.trim() });
      await onOtpVerified();
      navigate("/portal");
    } catch (e: any) {
      const statusCode = typeof e?.status === "number" ? e.status : undefined;
      const msg =
        statusCode === 429
          ? "Too many attempts. Please wait and try again."
          : typeof e?.message === "string"
            ? e.message
            : "OTP verification failed";
      setStatus({ kind: "error", message: msg });
    }
  }

  const resendSecondsLeft = useMemo(() => {
    const ms = resendAvailableAt - nowMs;
    if (ms <= 0) return 0;
    return Math.ceil(ms / 1000);
  }, [resendAvailableAt, nowMs]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Seo title="Sign In" description="Sign in to HZ IT Company with email OTP." path="/auth" />

      <section className="relative pt-32 pb-16 bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 font-poppins">{header}</h1>
            <p className="text-lg text-gray-300">No password needed â€” sign in with a one-time code.</p>
          </motion.div>
        </div>
      </section>

      <section className="pb-20 bg-gray-50">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-gray-200">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  className={
                    "rounded-lg border px-3 py-2 text-sm " +
                    (step === "request" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300")
                  }
                  onClick={() => {
                    setStep("request");
                    setStatus({ kind: "idle" });
                  }}
                >
                  Request OTP
                </button>
                <button
                  type="button"
                  disabled={!emailForVerify}
                  className={
                    "rounded-lg border px-3 py-2 text-sm " +
                    (step === "verify" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300") +
                    (!emailForVerify ? " opacity-60 cursor-not-allowed" : "")
                  }
                  onClick={() => {
                    if (!emailForVerify) return;
                    setStep("verify");
                    setStatus({ kind: "idle" });
                  }}
                >
                  Verify
                </button>
              </div>

              <Link to="/" className="text-sm text-blue-700 hover:underline">
                Back to website
              </Link>
            </div>

            {status.kind !== "idle" ? (
              <div
                className={
                  "mt-4 rounded-xl px-4 py-3 text-sm border " +
                  (status.kind === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900")
                }
                role="status"
                aria-live="polite"
              >
                {status.message}
              </div>
            ) : null}

            {step === "request" ? (
              <form className="mt-6 space-y-5" onSubmit={handleSubmitRequest(onRequest)} noValidate>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
                  <input
                    {...registerRequest("email")}
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    className={
                      "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                      (requestErrors.email ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                    }
                    placeholder="you@example.com"
                  />
                  {requestErrors.email ? <p className="mt-1 text-sm text-rose-700">{requestErrors.email.message}</p> : null}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={
                    "w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-lg transition-all " +
                    (loading ? "opacity-70 cursor-not-allowed" : "hover:shadow-xl hover:scale-[1.02]")
                  }
                >
                  {loading ? "Sendingâ€¦" : "Send OTP"}
                </button>

                <div className="relative flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 uppercase tracking-wide">or</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="flex justify-center">
                  <GoogleLoginButton
                    width={320}
                    onSuccess={() => navigate("/portal")}
                    onError={(msg) => setStatus({ kind: "error", message: msg })}
                  />
                </div>

                <div className="flex justify-between text-sm text-gray-500 pt-1">
                  <Link to="/portal/login" className="hover:underline">
                    Use password
                  </Link>
                  <Link to="/admin/login" className="hover:underline">
                    Admin login
                  </Link>
                </div>
              </form>
            ) : (
              <form className="mt-6 space-y-5" onSubmit={handleSubmitVerify(onVerify)} noValidate>
                <div>
                  <p className="text-sm text-gray-500">OTP sent to</p>
                  <p className="mt-0.5 text-gray-900 font-semibold">{emailForVerify || "â€”"}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">6-digit OTP</label>
                  <input
                    {...registerVerify("token")}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className={
                      "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 tracking-widest text-center text-xl " +
                      (verifyErrors.token ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                    }
                    placeholder="123456"
                    maxLength={6}
                  />
                  {verifyErrors.token ? <p className="mt-1 text-sm text-rose-700">{verifyErrors.token.message}</p> : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setStep("request");
                      setStatus({ kind: "idle" });
                    }}
                    className="px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-70"
                  >
                    Change email
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
                  >
                    {loading ? "Verifyingâ€¦" : "Verify"}
                  </button>
                </div>

                <div className="flex justify-between text-sm text-gray-500">
                  <button
                    type="button"
                    className={"hover:underline" + (resendSecondsLeft > 0 || loading ? " opacity-60 cursor-not-allowed" : "")}
                    disabled={resendSecondsLeft > 0 || loading}
                    onClick={onResend}
                  >
                    {resendSecondsLeft > 0 ? `Resend in ${resendSecondsLeft}s` : "Resend OTP"}
                  </button>
                  <button type="button" className="hover:underline" onClick={() => navigate(-1)}>
                    Back
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
