import { useState } from "react";
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
import { submitHireUs } from "../services/contactService";
import { trackEvent } from "../analytics/track";

export function HireUs() {
  const [step, setStep] = useState(1);
  const [submitState, setSubmitState] = useState<{
    status: "idle" | "loading" | "success" | "error";
    message?: string;
  }>({ status: "idle" });

  const services = [
    { id: "web", icon: Code, label: "Web Development" },
    { id: "mobile", icon: Smartphone, label: "Mobile Apps" },
    { id: "cloud", icon: Cloud, label: "Cloud Solutions" },
    { id: "consulting", icon: Lightbulb, label: "IT Consulting" },
    { id: "database", icon: Database, label: "Database Management" },
    { id: "security", icon: Shield, label: "Cybersecurity" },
    { id: "design", icon: Palette, label: "UI/UX Design" },
    { id: "analytics", icon: BarChart3, label: "Data Analytics" },
  ];

  const budgetRanges = [
    "< $10,000",
    "$10,000 - $25,000",
    "$25,000 - $50,000",
    "$50,000 - $100,000",
    "$100,000+",
  ];

  const timelineOptions = [
    "Less than 1 month",
    "1-3 months",
    "3-6 months",
    "6-12 months",
    "12+ months",
  ];

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
      budget: "",
      timeline: "",
      referenceUrl: "",
      additionalNotes: "",
      companyWebsite: "",
    },
    mode: "onTouched",
  });

  const selectedServices = watch("services");

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
    3: ["projectName", "projectDescription", "budget", "timeline"],
    4: ["referenceUrl", "additionalNotes"],
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
    if (step === 3) return Boolean(values.projectName && values.projectDescription && values.budget && values.timeline);
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
      await submitHireUs({
        name: values.name,
        email: values.email,
        phone: values.phone,
        company: values.company || undefined,
        services: values.services,
        projectName: values.projectName,
        projectDescription: values.projectDescription,
        budget: values.budget,
        timeline: values.timeline,
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
            {submitState.status !== "idle" ? (
              <div
                className={
                  "mb-6 rounded-xl px-4 py-3 text-sm border " +
                  (submitState.status === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : submitState.status === "error"
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
                    Choose one or more services you're interested in
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
                            className={`p-6 rounded-2xl border-2 transition-all duration-200 text-left ${
                              isSelected
                                ? "border-blue-600 bg-blue-50 shadow-lg"
                                : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center">
                              <div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${
                                  isSelected
                                    ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                                aria-hidden="true"
                              >
                                <service.icon size={24} />
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900">{service.label}</div>
                              </div>
                              {isSelected ? (
                                <CheckCircle2 className="text-blue-600" size={24} aria-hidden="true" />
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="hire-budget" className="block text-sm font-medium text-gray-700 mb-2">
                        Budget Range *
                      </label>
                      <select
                        id="hire-budget"
                        {...register("budget")}
                        aria-describedby={errors.budget ? "hire-budget-error" : undefined}
                        className={
                          "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                          (errors.budget ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                        }
                      >
                        <option value="">Select budget</option>
                        {budgetRanges.map((range) => (
                          <option key={range} value={range}>
                            {range}
                          </option>
                        ))}
                      </select>
                      {errors.budget ? (
                        <p id="hire-budget-error" className="mt-2 text-sm text-rose-700">
                          {errors.budget.message}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label htmlFor="hire-timeline" className="block text-sm font-medium text-gray-700 mb-2">
                        Timeline *
                      </label>
                      <select
                        id="hire-timeline"
                        {...register("timeline")}
                        aria-describedby={errors.timeline ? "hire-timeline-error" : undefined}
                        className={
                          "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                          (errors.timeline ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                        }
                      >
                        <option value="">Select timeline</option>
                        {timelineOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      {errors.timeline ? (
                        <p id="hire-timeline-error" className="mt-2 text-sm text-rose-700">
                          {errors.timeline.message}
                        </p>
                      ) : null}
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
            </form>
          </motion.div>
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
    </div>
  );
}