import { Seo } from "../components/Seo";
import { siteConfig } from "../config/site";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { careerSchema, type CareerFormValues } from "../schemas/careerSchema";
import { createCareerUploadUrlAuthed, submitCareerApplyAuthed, uploadFileToSignedUrlWithProgress } from "../services/careersService";
import { useAuth } from "../auth/AuthProvider";
import { GoogleLoginButton } from "../components/GoogleLoginButton";
import { trackEvent } from "../analytics/track";
import { CmsSlot } from "../components/cms/CmsBlocks";

const OPEN_ROLES = [
  { title: "Software Developer", subtitle: "Web & app development" },
  { title: "Digital marketing", subtitle: "SEO • Social • Ads" },
  { title: "Web Designer/Ui-Ux", subtitle: "Figma • Design systems" },
  { title: "Data&Cloud Operator", subtitle: "Cloud ops • Data handling" },
  { title: "Cyber Security(1+)", subtitle: "Security monitoring • Hardening" },
  { title: "Trainer of cources(2+)", subtitle: "Training • Mentorship" },
] as const;

export function Careers() {
  const { isAuthed, openAuthModal } = useAuth();
  const [submitState, setSubmitState] = useState<{
    status: "idle" | "loading" | "success" | "error";
    message?: string;
  }>({ status: "idle" });

  const [resumeUploadDraft, setResumeUploadDraft] = useState<
    | {
        fileKey: string;
        upload: { signedUrl: string; path: string };
      }
    | null
  >(null);

  const email = siteConfig.contact.email;
  const phoneDigits = siteConfig.contact.phone.replace(/\D/g, "");
  const whatsappDigitsRaw = siteConfig.contact.whatsapp.replace(/\D/g, "");
  const whatsappDigits = whatsappDigitsRaw.length === 10 ? `91${whatsappDigitsRaw}` : whatsappDigitsRaw;

  const mailtoHref = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
    "Career Application — HZ IT Company"
  )}&body=${encodeURIComponent(
    "Hi HZ IT Company,%0D%0A%0D%0AI’m interested in applying. Here are my details:%0D%0A- Name:%0D%0A- Role:%0D%0A- Phone:" +
      (phoneDigits.length === 10 ? ` +91 ${phoneDigits}` : phoneDigits ? ` +${phoneDigits}` : "") +
      "%0D%0A- Location: India%0D%0A%0D%0APlease find my resume attached.%0D%0A"
  )}`;

  const whatsappHref = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
    "Hi HZ IT Company, I want to apply for a job. Please share next steps."
  )}`;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CareerFormValues>({
    resolver: zodResolver(careerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "",
      experience: "",
      linkedinUrl: "",
      portfolioUrl: "",
      resumeFile: undefined,
      whyHireYou: "",
      message: "",
      companyWebsite: "",
    },
    mode: "onTouched",
  });

  const resumeFile = useMemo(() => {
    const resumeFileList = (watch("resumeFile") as any as FileList | undefined);
    return resumeFileList?.item(0) ?? undefined;
  }, [watch]);

  const resumeFileKey = useMemo(() => {
    if (!resumeFile) return null;
    const anyFile = resumeFile as any;
    return [resumeFile.name, resumeFile.type, resumeFile.size, String(anyFile.lastModified ?? "")].join("|");
  }, [resumeFile]);

  useEffect(() => {
    // Pre-create the signed upload URL as soon as the user selects a resume.
    // This removes one round-trip from the submit button path.
    if (!isAuthed) {
      setResumeUploadDraft(null);
      return;
    }
    if (!resumeFile || !resumeFileKey) {
      setResumeUploadDraft(null);
      return;
    }

    let cancelled = false;
    // If we already have a draft for this exact file, keep it.
    if (resumeUploadDraft?.fileKey === resumeFileKey) return;

    createCareerUploadUrlAuthed({
      kind: "resume",
      fileName: resumeFile.name,
      fileType: resumeFile.type,
      fileSize: resumeFile.size,
    })
      .then((upload) => {
        if (cancelled) return;
        setResumeUploadDraft({ fileKey: resumeFileKey, upload: { signedUrl: upload.signedUrl, path: upload.path } });
      })
      .catch(() => {
        // Non-blocking: if this fails, we will retry during submit.
        if (cancelled) return;
        setResumeUploadDraft(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthed, resumeFile, resumeFileKey, resumeUploadDraft?.fileKey]);

  const onSubmit = async (values: CareerFormValues) => {
    setSubmitState({ status: "loading" });

    if (values.companyWebsite && values.companyWebsite.trim().length > 0) {
      setSubmitState({ status: "success", message: "Thanks — we’ll get back to you shortly." });
      trackEvent("career_submit", { result: "honeypot" });
      reset();
      return;
    }

    try {
      if (!isAuthed) {
        openAuthModal();
        setSubmitState({ status: "error", message: "Please log in to submit your application." });
        return;
      }

      const resumeFileList = (values as any).resumeFile as FileList | undefined;
      const resumeFileFromValues = resumeFileList?.item(0) ?? undefined;

      if (!resumeFileFromValues) throw new Error("Resume is required.");

      // Use pre-created upload URL if available for this file, otherwise create now.
      const fileKeyFromValues = [
        resumeFileFromValues.name,
        resumeFileFromValues.type,
        resumeFileFromValues.size,
        String((resumeFileFromValues as any)?.lastModified ?? "")
      ].join("|");

      const upload =
        resumeUploadDraft?.fileKey === fileKeyFromValues
          ? resumeUploadDraft.upload
          : await createCareerUploadUrlAuthed({
              kind: "resume",
              fileName: resumeFileFromValues.name,
              fileType: resumeFileFromValues.type,
              fileSize: resumeFileFromValues.size,
            });

      await uploadFileToSignedUrlWithProgress(upload.signedUrl, resumeFileFromValues);
      const resumePath = upload.path;

      await submitCareerApplyAuthed({
        fullName: values.name,
        email: values.email,
        phone: values.phone,
        position: values.role,
        linkedinUrl: values.linkedinUrl,
        whyHireYou: values.whyHireYou,
        experience: values.experience || undefined,
        portfolioUrl: values.portfolioUrl || undefined,
        resumePath,
        message: values.message || undefined,
        honeypot: values.companyWebsite || undefined,
      });

      setSubmitState({
        status: "success",
        message: "Application received. We’ll contact you soon with next steps.",
      });
      trackEvent("career_submit", { result: "success" });
      reset();
    } catch (e: any) {
      const is401 = e?.status === 401 || (typeof e?.message === "string" && e.message.toLowerCase().includes("unauthorized"));
      setSubmitState({
        status: "error",
        message: is401
          ? "Session expired. Please log out and log in again, then resubmit."
          : typeof e?.message === "string" ? e.message : "Something went wrong. Please try again.",
      });
      trackEvent("career_submit", { result: "error" });
    }
  };

  return (
    <div className="min-h-screen">
      <Seo
        title="Careers"
        description="Explore open roles and apply to join HZ IT Company."
        path="/careers"
      />

      {/* Hero */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], rotate: [90, 0, 90] }}
            transition={{ duration: 16, repeat: Infinity }}
            className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 font-poppins">Careers</h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              We’re hiring in India. Share your profile and we’ll get back to you with next steps.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 font-poppins">Application form</h2>
                <p className="mt-2 text-gray-600">Fill this like a quick Google Form — we’ll reach out soon.</p>

                {submitState.status === "success" ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center py-10 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.1 }}
                      className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mb-6 ring-4 ring-emerald-400/40"
                    >
                      <svg className="w-12 h-12 text-emerald-600" fill="none" viewBox="0 0 24 24">
                        <motion.path
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.55, delay: 0.35, ease: "easeOut" }}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          stroke="currentColor"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </motion.div>
                    <motion.h3
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="text-2xl font-bold text-gray-900 font-poppins"
                    >
                      Application Submitted!
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="mt-2 text-gray-600 max-w-sm"
                    >
                      {submitState.message}
                    </motion.p>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
                    >
                      <a
                        href="/profile"
                        className="px-6 py-3 rounded-xl border border-blue-600 text-blue-700 font-semibold hover:bg-blue-50 transition-all text-center"
                      >
                        View my Profile
                      </a>
                      <a
                        href="/"
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold text-center hover:shadow-lg transition-all"
                      >
                        Back to Home
                      </a>
                    </motion.div>
                  </motion.div>
                ) : (
                  <>
                {submitState.status !== "idle" ? (
                  <div
                    className={
                      "mt-6 rounded-xl px-4 py-3 text-sm border " +
                      (submitState.status === "error"
                          ? "bg-rose-50 border-rose-200 text-rose-900"
                          : "bg-gray-50 border-gray-200 text-gray-800")
                    }
                    role="status"
                    aria-live="polite"
                  >
                    {submitState.message ?? (submitState.status === "loading" ? "Submitting…" : "")}
                  </div>
                ) : null}

                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
                  <div className="sr-only" aria-hidden="true">
                    <label htmlFor="companyWebsite">Company Website</label>
                    <input id="companyWebsite" type="text" tabIndex={-1} autoComplete="off" {...register("companyWebsite")} />
                  </div>

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full name *
                    </label>
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      {...register("name")}
                      className={
                        "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                        (errors.name ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                      }
                      placeholder="Your name"
                    />
                    {errors.name ? <p className="mt-2 text-sm text-rose-700">{errors.name.message}</p> : null}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        id="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        {...register("email")}
                        className={
                          "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                          (errors.email ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                        }
                        placeholder="you@example.com"
                      />
                      {errors.email ? <p className="mt-2 text-sm text-rose-700">{errors.email.message}</p> : null}
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone *
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        {...register("phone")}
                        className={
                          "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                          (errors.phone ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                        }
                        placeholder={siteConfig.contact.phone}
                      />
                      {errors.phone ? <p className="mt-2 text-sm text-rose-700">{errors.phone.message}</p> : null}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                      Role you’re applying for *
                    </label>
                    <select
                      id="role"
                      {...register("role")}
                      className={
                        "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                        (errors.role ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                      }
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select a role
                      </option>
                      {OPEN_ROLES.map((r) => (
                        <option key={r.title} value={r.title}>
                          {r.title}
                        </option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                    {errors.role ? <p className="mt-2 text-sm text-rose-700">{errors.role.message}</p> : null}
                  </div>

                  <div>
                    <label htmlFor="linkedinUrl" className="block text-sm font-medium text-gray-700 mb-2">
                      LinkedIn link *
                    </label>
                    <input
                      id="linkedinUrl"
                      type="url"
                      inputMode="url"
                      {...register("linkedinUrl")}
                      className={
                        "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                        (errors.linkedinUrl ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                      }
                      placeholder="https://www.linkedin.com/in/..."
                    />
                    {errors.linkedinUrl ? <p className="mt-2 text-sm text-rose-700">{errors.linkedinUrl.message}</p> : null}
                  </div>

                  <div>
                    <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
                      Experience (optional)
                    </label>
                    <input
                      id="experience"
                      type="text"
                      {...register("experience")}
                      className={
                        "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                        (errors.experience ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                      }
                      placeholder="e.g., 2 years"
                    />
                    {errors.experience ? <p className="mt-2 text-sm text-rose-700">{errors.experience.message}</p> : null}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="portfolioUrl" className="block text-sm font-medium text-gray-700 mb-2">
                        Portfolio URL (optional)
                      </label>
                      <input
                        id="portfolioUrl"
                        type="url"
                        inputMode="url"
                        {...register("portfolioUrl")}
                        className={
                          "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                          (errors.portfolioUrl ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                        }
                        placeholder="https://..."
                      />
                      {errors.portfolioUrl ? (
                        <p className="mt-2 text-sm text-rose-700">{errors.portfolioUrl.message}</p>
                      ) : null}
                    </div>
                    <div>
                      <label htmlFor="resumeFile" className="block text-sm font-medium text-gray-700 mb-2">
                        Resume *
                      </label>
                      <input
                        id="resumeFile"
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        {...register("resumeFile")}
                        className={
                          "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                          (errors.resumeFile ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                        }
                      />
                      {errors.resumeFile ? <p className="mt-2 text-sm text-rose-700">{String(errors.resumeFile.message ?? "Invalid file")}</p> : null}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="whyHireYou" className="block text-sm font-medium text-gray-700 mb-2">
                      Why should we hire you? *
                    </label>
                    <textarea
                      id="whyHireYou"
                      rows={4}
                      {...register("whyHireYou")}
                      className={
                        "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 resize-y " +
                        (errors.whyHireYou ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                      }
                      placeholder="Tell us in 2-4 lines"
                    />
                    {errors.whyHireYou ? <p className="mt-2 text-sm text-rose-700">{errors.whyHireYou.message}</p> : null}
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message (optional)
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      {...register("message")}
                      className={
                        "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 resize-y " +
                        (errors.message ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                      }
                      placeholder="A short note about you"
                    />
                    {errors.message ? <p className="mt-2 text-sm text-rose-700">{errors.message.message}</p> : null}
                  </div>

                  {!isAuthed ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 flex flex-col items-center gap-3">
                      <p className="text-sm text-blue-800 font-medium text-center">Sign in to submit your application</p>
                      <GoogleLoginButton onSuccess={() => {}} onError={() => {}} />
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={
                      "min-h-11 w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all " +
                      (isSubmitting ? "opacity-70 cursor-not-allowed" : "")
                    }
                  >
                    Submit application
                  </button>

                  <a href="/" className="block text-center text-sm text-gray-600 hover:underline">
                    Back to website
                  </a>
                </form>

                <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                  <div className="font-semibold text-gray-900">Prefer email or WhatsApp?</div>
                  <div className="mt-2 flex flex-col sm:flex-row gap-3">
                    <a
                      href={mailtoHref}
                      className="min-h-11 inline-flex items-center justify-center rounded-xl bg-white border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                    >
                      Apply via Email
                    </a>
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-11 inline-flex items-center justify-center rounded-xl bg-white border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                    >
                      WhatsApp Us
                    </a>
                  </div>
                </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Admin-managed page blocks */}
      <CmsSlot contentKey="page.careers" />
    </div>
  );
}
