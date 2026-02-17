import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Seo } from "../components/Seo";
import { requestOtp, verifyOtp } from "../services/otpService";
import { setSession } from "../auth/session";

const requestSchema = z
  .object({
    name: z.string().min(2, "Enter your name").max(120).optional().or(z.literal("")),
    email: z.string().email("Enter a valid email").max(254),
    phone: z.string().min(8, "Enter a valid phone number").max(20),
  })
  .strict();

type RequestValues = z.infer<typeof requestSchema>;

const verifySchema = z
  .object({
    otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit OTP"),
  })
  .strict();

type VerifyValues = z.infer<typeof verifySchema>;

type Step = "request" | "verify";

export function Auth() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("request");
  const [phoneForVerify, setPhoneForVerify] = useState<string>("");
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "idle" | "success" | "error"; message?: string }>({ kind: "idle" });

  const {
    register: registerRequest,
    handleSubmit: handleSubmitRequest,
    formState: { errors: requestErrors, isSubmitting: requestSubmitting },
  } = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { name: "", email: "", phone: "" },
    mode: "onTouched",
  });

  const {
    register: registerVerify,
    handleSubmit: handleSubmitVerify,
    formState: { errors: verifyErrors, isSubmitting: verifySubmitting },
  } = useForm<VerifyValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { otp: "" },
    mode: "onTouched",
  });

  const loading = requestSubmitting || verifySubmitting;

  const header = useMemo(
    () => (step === "request" ? "Sign in with OTP" : "Verify OTP"),
    [step]
  );

  async function onRequest(values: RequestValues) {
    setStatus({ kind: "idle" });
    setDebugOtp(null);

    const payload = {
      name: values.name?.trim() ? values.name.trim() : undefined,
      email: values.email.trim(),
      phone: values.phone.trim(),
    };

    try {
      const r = await requestOtp(payload);
      setPhoneForVerify(payload.phone);
      setStep("verify");
      if (r.debugOtp) setDebugOtp(r.debugOtp);
      setStatus({ kind: "success", message: "OTP sent. Please check your phone." });
    } catch (e: any) {
      setStatus({ kind: "error", message: e?.message ?? "Failed to send OTP" });
    }
  }

  async function onVerify(values: VerifyValues) {
    setStatus({ kind: "idle" });

    try {
      const r = await verifyOtp({ phone: phoneForVerify, otp: values.otp.trim() });
      setSession(r.token, "client");
      navigate("/portal");
    } catch (e: any) {
      setStatus({ kind: "error", message: e?.message ?? "OTP verification failed" });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Seo title="Authentication" description="Sign in to HZ IT Company." path="/auth" />

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
            <p className="text-lg text-gray-300">Secure login for India mobile numbers.</p>
          </motion.div>
        </div>
      </section>

      <section className="pb-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-gray-200">
            <div className="flex items-center justify-between gap-3">
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
                  disabled={!phoneForVerify}
                  className={
                    "rounded-lg border px-3 py-2 text-sm " +
                    (step === "verify" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300") +
                    (!phoneForVerify ? " opacity-60 cursor-not-allowed" : "")
                  }
                  onClick={() => {
                    if (!phoneForVerify) return;
                    setStep("verify");
                    setStatus({ kind: "idle" });
                  }}
                >
                  Verify
                </button>
              </div>

              <Link to="/portal/login" className="text-sm text-blue-700 hover:underline">
                Use email/password
              </Link>
            </div>

            {status.kind !== "idle" ? (
              <div
                className={
                  "mt-6 rounded-xl px-4 py-3 text-sm border " +
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

            {debugOtp ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm">
                <div className="font-semibold">Dev OTP</div>
                <div className="mt-1">{debugOtp}</div>
              </div>
            ) : null}

            {step === "request" ? (
              <form className="mt-8 space-y-5" onSubmit={handleSubmitRequest(onRequest)} noValidate>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name (optional)</label>
                  <input
                    {...registerRequest("name")}
                    autoComplete="name"
                    className={
                      "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                      (requestErrors.name ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                    }
                    placeholder="Your name"
                  />
                  {requestErrors.name ? <p className="mt-2 text-sm text-rose-700">{requestErrors.name.message as any}</p> : null}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
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
                  {requestErrors.email ? <p className="mt-2 text-sm text-rose-700">{requestErrors.email.message}</p> : null}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                  <input
                    {...registerRequest("phone")}
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    className={
                      "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                      (requestErrors.phone ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                    }
                    placeholder="+91 8101515185"
                  />
                  {requestErrors.phone ? <p className="mt-2 text-sm text-rose-700">{requestErrors.phone.message}</p> : null}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={
                    "w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg transition-all duration-200 flex items-center justify-center " +
                    (loading ? "opacity-70 cursor-not-allowed" : "hover:shadow-xl hover:scale-[1.02]")
                  }
                >
                  {loading ? "Sending…" : "Send OTP"}
                </button>

                <div className="flex justify-between text-sm text-gray-600">
                  <Link to="/admin/login" className="hover:underline">
                    Admin login
                  </Link>
                  <Link to="/" className="hover:underline">
                    Back to website
                  </Link>
                </div>
              </form>
            ) : (
              <form className="mt-8 space-y-5" onSubmit={handleSubmitVerify(onVerify)} noValidate>
                <div>
                  <div className="text-sm text-gray-600">OTP sent to</div>
                  <div className="mt-1 text-gray-900 font-semibold">{phoneForVerify || "—"}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">6-digit OTP *</label>
                  <input
                    {...registerVerify("otp")}
                    inputMode="numeric"
                    className={
                      "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 tracking-widest " +
                      (verifyErrors.otp ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                    }
                    placeholder="123456"
                    maxLength={6}
                  />
                  {verifyErrors.otp ? <p className="mt-2 text-sm text-rose-700">{verifyErrors.otp.message}</p> : null}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setStep("request");
                      setStatus({ kind: "idle" });
                    }}
                    className={
                      "px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition-colors " +
                      (loading ? "opacity-70 cursor-not-allowed" : "")
                    }
                  >
                    Change number
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={
                      "px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-lg transition-all " +
                      (loading ? "opacity-70 cursor-not-allowed" : "hover:shadow-xl")
                    }
                  >
                    {loading ? "Verifying…" : "Verify & Continue"}
                  </button>
                </div>

                <div className="flex justify-between text-sm text-gray-600">
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() => {
                      setStep("request");
                      setStatus({ kind: "idle" });
                      setDebugOtp(null);
                    }}
                  >
                    Resend OTP
                  </button>
                  <Link to="/" className="hover:underline">
                    Back to website
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
