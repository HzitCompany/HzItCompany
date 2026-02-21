import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Code,
  Smartphone,
  Cloud,
  Lightbulb,
  Database,
  Shield,
  Palette,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { Seo } from "../components/Seo";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { hireUsSchema, type HireUsFormValues } from "../schemas/hireUsSchema";
import { submitHireUsAuthed } from "../services/contactService";
import { trackEvent } from "../analytics/track";
import { CmsSlot } from "../components/cms/CmsBlocks";

export function HireUs() {
  const [step, setStep] = useState(1);
  const [submitState, setSubmitState] = useState<{
    status: "idle" | "loading" | "success" | "error";
    message?: string;
  }>({ status: "idle" });

  useEffect(() => {
    if (submitState.status === "success") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [submitState.status]);

  const services = [
    {
      id: "website-development",
      icon: Code,
      label: "Website Development",
      pricing: [
        { plan: "Basic Website (1–5 pages)", priceInr: 4999 },
        { plan: "Business Website (5–10 pages)", priceInr: 9999 },
        { plan: "Advanced Website", priceInr: 14999 },
      ],
    },
    {
      id: "website-uiux",
      icon: Palette,
      label: "Website Design (UI/UX)",
      pricing: [
        { plan: "Basic Design", priceInr: 2999 },
        { plan: "Professional Design", priceInr: 4999 },
        { plan: "Premium UI/UX Design", priceInr: 7999 },
      ],
    },
    {
      id: "digital-marketing",
      icon: BarChart3,
      label: "Digital Marketing",
      pricing: [
        { plan: "Basic Marketing (Monthly)", priceInr: 3999 },
        { plan: "Standard Marketing (Monthly)", priceInr: 6999 },
        { plan: "Advanced Marketing (Monthly)", priceInr: 9999 },
      ],
    },
    {
      id: "social-media-management",
      icon: Smartphone,
      label: "Social Media Management",
      pricing: [
        { plan: "1 Platform (Monthly)", priceInr: 1999 },
        { plan: "2 Platforms (Monthly)", priceInr: 2999 },
        { plan: "3 Platforms (Monthly)", priceInr: 3999 },
      ],
    },
    {
      id: "seo-services",
      icon: BarChart3,
      label: "SEO Services",
      pricing: [
        { plan: "Basic SEO (Monthly)", priceInr: 2999 },
        { plan: "Standard SEO (Monthly)", priceInr: 4999 },
        { plan: "Advanced SEO (Monthly)", priceInr: 7999 },
      ],
    },
    {
      id: "google-business-setup",
      icon: Cloud,
      label: "Google Business Setup",
      pricing: [
        { plan: "New Profile Setup", priceInr: 999 },
        { plan: "Optimization", priceInr: 1999 },
      ],
    },
    {
      id: "website-maintenance",
      icon: Database,
      label: "Website Maintenance",
      pricing: [
        { plan: "Basic Maintenance (Monthly)", priceInr: 999 },
        { plan: "Standard Maintenance (Monthly)", priceInr: 1999 },
        { plan: "Advanced Maintenance (Monthly)", priceInr: 2999 },
      ],
    },
    {
      id: "cybersecurity-services",
      icon: Shield,
      label: "Cybersecurity Services",
      pricing: [
        { plan: "Basic Security", priceInr: 1999 },
        { plan: "Advanced Security", priceInr: 3999 },
        { plan: "Full Protection", priceInr: 6999 },
      ],
    },
    {
      id: "logo-design",
      icon: Palette,
      label: "Logo Design",
      pricing: [
        { plan: "Basic Logo", priceInr: 999 },
        { plan: "Professional Logo", priceInr: 1999 },
        { plan: "Premium Logo", priceInr: 2999 },
      ],
    },
    {
      id: "poster-banner-design",
      icon: Lightbulb,
      label: "Poster / Banner Design",
      pricing: [
        { plan: "Single Poster", priceInr: 499 },
        { plan: "5 Posters Package", priceInr: 1999 },
      ],
    },
  ];

  const inr = new Intl.NumberFormat("en-IN");
  const fmtInr = (amount: number) => `₹${inr.format(amount)}`;

  const deliveryDaysOptions = [7, 14, 21, 30, 45, 60, 90];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HireUsFormValues>({
    resolver: zodResolver(hireUsSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      services: [],
      projectName: "",
      projectDescription: "",
      serviceDetails: {},
      deliveryDays: 14,
      clarification: "",
      personalMessage: "",
      referenceUrl: "",
      additionalNotes: "",
      companyWebsite: "",
    },
    mode: "onTouched",
  });

  const selectedServices = watch("services");

  const serviceLabelById = (id: string) => services.find((s) => s.id === id)?.label ?? id;

  const toggleService = (serviceId: string) => {
    const current = selectedServices ?? [];
    const next = current.includes(serviceId)
      ? current.filter((s) => s !== serviceId)
      : [...current, serviceId];
    setValue("services", next, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };

  const stepFields: Record<number, (keyof HireUsFormValues)[]> = {
    1: ["name", "email", "phone", "company"],
    2: ["services"],
    3: ["projectName", "projectDescription"],
    4: ["deliveryDays", "clarification", "personalMessage", "referenceUrl", "additionalNotes"],
  };

  const nextStep = async () => {
    const ok = await trigger(stepFields[step] ?? []);
    if (ok && step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const canProceed = (() => {
    const values = watch();
    if (step === 1) return Boolean(values.name && values.email && values.phone);
    if (step === 2) return (values.services?.length ?? 0) > 0;
    if (step === 3) return Boolean(values.projectName && values.projectDescription);
    return true;
  })();

  const onSubmit = async (values: HireUsFormValues) => {
    setSubmitState({ status: "loading" });

    if (values.companyWebsite && values.companyWebsite.trim().length > 0) {
      setSubmitState({ status: "success", message: "Thanks — we’ll be in touch shortly." });
      trackEvent("hire_us_submit", { result: "honeypot" });
      reset();
      setStep(1);
      return;
    }

    try {
      await submitHireUsAuthed({
        name: values.name,
        email: values.email,
        phone: values.phone,
        company: values.company || undefined,
        services: values.services,
        projectName: values.projectName,
        projectDescription: values.projectDescription,
        serviceDetails: values.serviceDetails ?? undefined,
        deliveryDays: values.deliveryDays,
        clarification: values.clarification || undefined,
        personalMessage: values.personalMessage || undefined,
        referenceUrl: values.referenceUrl || undefined,
        additionalNotes: values.additionalNotes || undefined,
        honeypot: values.companyWebsite || undefined,
      });
      setSubmitState({
        status: "success",
        message: "Request received. We’ll reach out within 1 business day with next steps.",
      });
      trackEvent("hire_us_submit", { result: "success" });
      reset();
      setStep(1);
    } catch (e: any) {
      setSubmitState({
        status: "error",
        message: typeof e?.message === "string" ? e.message : "Something went wrong. Please try again.",
      });
      trackEvent("hire_us_submit", { result: "error" });
    }
  };

  return (
    <div className="min-h-screen">
      <Seo
        title="Hire Us"
        description="Start a project with HZ IT Company. Share your scope, timeline, and budget—then we’ll propose a delivery plan and a clear statement of work."
        path="/hire-us"
      />
      {/* Hero Section */}
      <section className="relative py-32 bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1
              className="text-5xl md:text-6xl font-bold mb-6 font-poppins"
            >
              Let's Build Together
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
              Tell us about your project and we'll create a custom solution tailored to your needs.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {submitState.status === "success" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 md:p-12 shadow-xl border border-white/40 flex flex-col items-center text-center"
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
                Request Submitted!
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
                className="mt-8 flex flex-col sm:flex-row gap-3"
              >
                <button
                  type="button"
                  onClick={() => { setSubmitState({ status: "idle" }); setStep(1); }}
                  className="px-6 py-3 rounded-xl border border-blue-600 text-blue-700 font-semibold hover:bg-blue-50 transition-all"
                >
                  Start another request
                </button>
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
          {/* Progress Steps */}
          <div className="mb-12">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="flex items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                      step >= num
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                        : "bg-gray-300 text-gray-600"
                    }`}
                  >
                    {step > num ? <CheckCircle2 size={20} /> : num}
                  </div>
                  {num < 4 && (
                    <div
                      className={`flex-1 h-1 mx-2 transition-all duration-300 ${
                        step > num ? "bg-blue-600" : "bg-gray-300"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className={step >= 1 ? "text-blue-600 font-medium" : "text-gray-500"}>
                Personal Info
              </span>
              <span className={step >= 2 ? "text-blue-600 font-medium" : "text-gray-500"}>
                Services
              </span>
              <span className={step >= 3 ? "text-blue-600 font-medium" : "text-gray-500"}>
                Project Details
              </span>
              <span className={step >= 4 ? "text-blue-600 font-medium" : "text-gray-500"}>
                Additional Info
              </span>
            </div>
          </div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/70 backdrop-blur-lg rounded-3xl p-8 md:p-12 shadow-xl border border-white/40"
          >
            {(submitState.status === "error" || submitState.status === "loading") ? (
              <div
                className={
                  "mb-6 rounded-xl px-4 py-3 text-sm border " +
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

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="companyWebsite">Company Website</label>
                <input id="companyWebsite" type="text" tabIndex={-1} autoComplete="off" {...register("companyWebsite")} />
              </div>
              {/* Step 1: Personal Info */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <h2
                    className="text-3xl font-bold mb-6 text-gray-900 font-poppins"
                  >
                    Personal Information
                  </h2>

                  <div>
                    <label htmlFor="hire-name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="hire-name"
                      autoComplete="name"
                      {...register("name")}
                      aria-describedby={errors.name ? "hire-name-error" : undefined}
                      className={
                        "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                        (errors.name ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                      }
                      placeholder="John Doe"
                    />
                    {errors.name ? (
                      <p id="hire-name-error" className="mt-2 text-sm text-rose-700">
                        {errors.name.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="hire-email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="hire-email"
                        autoComplete="email"
                        inputMode="email"
                        {...register("email")}
                        aria-describedby={errors.email ? "hire-email-error" : undefined}
                        className={
                          "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                          (errors.email ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                        }
                        placeholder="john@example.com"
                      />
                      {errors.email ? (
                        <p id="hire-email-error" className="mt-2 text-sm text-rose-700">
                          {errors.email.message}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label htmlFor="hire-phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        id="hire-phone"
                        autoComplete="tel"
                        inputMode="tel"
                        {...register("phone")}
                        aria-describedby={errors.phone ? "hire-phone-error" : undefined}
                        className={
                          "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                          (errors.phone ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                        }
                        placeholder="+91 8101515185"
                      />
                      {errors.phone ? (
                        <p id="hire-phone-error" className="mt-2 text-sm text-rose-700">
                          {errors.phone.message}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="hire-company" className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name (Optional)
                    </label>
                    <input
                      type="text"
                      id="hire-company"
                      autoComplete="organization"
                      {...register("company")}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all"
                      placeholder="Your Company Inc."
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 2: Service Selection */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <h2
                    className="text-3xl font-bold mb-6 text-gray-900 font-poppins"
                  >
                    Select Services
                  </h2>
                  <p className="text-gray-600 mb-8">
                    Choose one or more services you're interested in (prices in INR)
                  </p>

                  <fieldset aria-describedby={errors.services ? "hire-services-error" : undefined}>
                    <legend className="sr-only">Services</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {services.map((service) => {
                        const isSelected = selectedServices?.includes(service.id) ?? false;
                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => toggleService(service.id)}
                            className={`p-3 sm:p-6 rounded-2xl border-2 transition-all duration-200 text-left w-full ${
                              isSelected
                                ? "border-blue-600 bg-blue-50 shadow-lg"
                                : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-start min-w-0">
                              <div
                                className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl flex items-center justify-center mr-3 sm:mr-4 mt-0.5 ${
                                  isSelected
                                    ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                                aria-hidden="true"
                              >
                                <service.icon size={20} />
                              </div>
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="font-semibold text-gray-900 text-sm sm:text-base">{service.label}</div>
                                <div className="mt-1 text-xs sm:text-sm text-gray-600 space-y-0.5">
                                  {service.pricing.map((p: any) => (
                                    <div key={p.plan} className="flex items-start justify-between gap-2">
                                      <span className="leading-snug break-words min-w-0">{p.plan}</span>
                                      <span className="shrink-0 font-semibold text-gray-900 whitespace-nowrap pl-1">{fmtInr(p.priceInr)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {isSelected ? (
                                <CheckCircle2 className="text-blue-600 shrink-0 ml-2 mt-0.5" size={20} aria-hidden="true" />
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  {errors.services ? (
                    <p id="hire-services-error" className="text-sm text-rose-700">
                      {errors.services.message as string}
                    </p>
                  ) : null}
                </motion.div>
              )}

              {/* Step 3: Project Details */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <h2
                    className="text-3xl font-bold mb-6 text-gray-900 font-poppins"
                  >
                    Project Details
                  </h2>

                  <div>
                    <label htmlFor="hire-project-name" className="block text-sm font-medium text-gray-700 mb-2">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      id="hire-project-name"
                      {...register("projectName")}
                      aria-describedby={errors.projectName ? "hire-project-name-error" : undefined}
                      className={
                        "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                        (errors.projectName ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                      }
                      placeholder="My Awesome Project"
                    />
                    {errors.projectName ? (
                      <p id="hire-project-name-error" className="mt-2 text-sm text-rose-700">
                        {errors.projectName.message}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="hire-project-description" className="block text-sm font-medium text-gray-700 mb-2">
                      Project Description *
                    </label>
                    <textarea
                      rows={6}
                      id="hire-project-description"
                      {...register("projectDescription")}
                      aria-describedby={errors.projectDescription ? "hire-project-description-error" : undefined}
                      className={
                        "w-full px-4 py-3 rounded-xl border outline-none transition-all resize-none focus:ring-2 focus:ring-blue-600/20 " +
                        (errors.projectDescription ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                      }
                      placeholder="Describe your project requirements, goals, and any specific features you need..."
                    />
                    {errors.projectDescription ? (
                      <p id="hire-project-description-error" className="mt-2 text-sm text-rose-700">
                        {errors.projectDescription.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <div className="text-sm font-semibold text-gray-900">Selected services</div>
                    <p className="mt-1 text-sm text-gray-600">Share a few details for each selected service.</p>

                    <div className="mt-4 space-y-4">
                      {(selectedServices ?? []).map((serviceId) => (
                        <div key={serviceId}>
                          <label
                            htmlFor={`hire-service-details-${serviceId}`}
                            className="block text-sm font-medium text-gray-700 mb-2"
                          >
                            {serviceLabelById(serviceId)} details (optional)
                          </label>
                          <textarea
                            id={`hire-service-details-${serviceId}`}
                            rows={4}
                            {...register(`serviceDetails.${serviceId}` as any)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all resize-none"
                            placeholder="Example: number of pages, features, platform, deliverables, etc."
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Additional Info */}
              {step === 4 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <h2
                    className="text-3xl font-bold mb-6 text-gray-900 font-poppins"
                  >
                    Additional Information
                  </h2>

                  <div>
                    <label htmlFor="hire-delivery-days" className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery timeline (days) *
                    </label>
                    <select
                      id="hire-delivery-days"
                      {...register("deliveryDays", {
                        setValueAs: (v) => {
                          const n = typeof v === "string" ? Number(v) : v;
                          return Number.isFinite(n) ? n : undefined;
                        },
                      })}
                      aria-describedby={errors.deliveryDays ? "hire-delivery-days-error" : undefined}
                      className={
                        "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                        (errors.deliveryDays ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                      }
                    >
                      {deliveryDaysOptions.map((d) => (
                        <option key={d} value={d}>
                          {d} days
                        </option>
                      ))}
                      <option value={120}>120+ days</option>
                    </select>
                    {errors.deliveryDays ? (
                      <p id="hire-delivery-days-error" className="mt-2 text-sm text-rose-700">
                        {String(errors.deliveryDays.message ?? "Invalid value")}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="hire-clarification" className="block text-sm font-medium text-gray-700 mb-2">
                      Service clarifications (optional)
                    </label>
                    <textarea
                      rows={5}
                      id="hire-clarification"
                      {...register("clarification")}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all resize-none"
                      placeholder="Any specific requirements, constraints, or preferences…"
                    />
                  </div>

                  <div>
                    <label htmlFor="hire-personal-message" className="block text-sm font-medium text-gray-700 mb-2">
                      Personal message (optional)
                    </label>
                    <textarea
                      rows={5}
                      id="hire-personal-message"
                      {...register("personalMessage")}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all resize-none"
                      placeholder="Any message for our team about these services…"
                    />
                  </div>

                  <div>
                    <label htmlFor="hire-reference-url" className="block text-sm font-medium text-gray-700 mb-2">
                      Reference URL (Optional)
                    </label>
                    <input
                      type="url"
                      id="hire-reference-url"
                      inputMode="url"
                      {...register("referenceUrl")}
                      aria-describedby="hire-reference-url-help"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all"
                      placeholder="https://example.com"
                    />
                    <p id="hire-reference-url-help" className="text-sm text-gray-500 mt-2">
                      Share any reference websites or designs you like
                    </p>
                  </div>

                  <div>
                    <label htmlFor="hire-additional-notes" className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      rows={6}
                      id="hire-additional-notes"
                      {...register("additionalNotes")}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all resize-none"
                      placeholder="Any other details you'd like to share..."
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <CheckCircle2 className="text-blue-600 mr-2" size={20} />
                      What Happens Next?
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 mr-2 flex-shrink-0" />
                        Our team will review your request within 24 hours
                      </li>
                      <li className="flex items-start">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 mr-2 flex-shrink-0" />
                        We'll schedule a free consultation call
                      </li>
                      <li className="flex items-start">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 mr-2 flex-shrink-0" />
                        Receive a detailed proposal and timeline
                      </li>
                      <li className="flex items-start">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 mr-2 flex-shrink-0" />
                        Begin your project with our expert team
                      </li>
                    </ul>
                  </div>
                </motion.div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-8 border-t border-gray-200">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
                  >
                    Previous
                  </button>
                )}

                <div className={step === 1 ? "ml-auto" : ""}>
                  {step < 4 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={!canProceed || isSubmitting}
                      className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
                        canProceed && !isSubmitting
                          ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl hover:scale-105"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      Next Step
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={
                        "px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg transition-all duration-200 flex items-center " +
                        (isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:shadow-xl hover:scale-105")
                      }
                    >
                      {isSubmitting ? "Submitting…" : "Submit Request"}
                      <CheckCircle2 size={18} className="ml-2" />
                    </button>
                  )}
                </div>
              </div>

              <a href="/" className="mt-6 block text-center text-sm text-gray-600 hover:underline">
                Back to website
              </a>
            </form>
          </motion.div>
            </>
          )}
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              className="text-4xl font-bold mb-4 text-gray-900 font-poppins"
            >
              Why Clients Trust Us
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Proven Track Record",
                description: "500+ successful projects delivered across various industries",
              },
              {
                title: "Expert Team",
                description: "50+ certified professionals with 15+ years of experience",
              },
              {
                title: "Client-First Approach",
                description: "98% client satisfaction rate with dedicated support",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Admin-managed page blocks */}
      <CmsSlot contentKey="page.hire-us" />
    </div>
  );
}