import { useState } from "react";
import { motion } from "motion/react";
import { Mail, Phone, MapPin, Send, Clock, MessageSquare } from "lucide-react";
import { CTAButton } from "../components/CTAButton";
import { Seo } from "../components/Seo";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactFormValues } from "../schemas/contactSchema";
import { submitContactAuthed } from "../services/contactService";
import { trackEvent } from "../analytics/track";
import { siteConfig } from "../config/site";
import { useAuth } from "../auth/AuthProvider";

export function Contact() {
  const { token } = useAuth();
  const [submitState, setSubmitState] = useState<{
    status: "idle" | "loading" | "success" | "error";
    message?: string;
  }>({ status: "idle" });

  const addressLine = [
    siteConfig.address.streetAddress,
    siteConfig.address.addressLocality,
    siteConfig.address.addressRegion,
    siteConfig.address.postalCode,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
      companyWebsite: "",
    },
    mode: "onTouched",
  });

  const onSubmit = async (values: ContactFormValues) => {
    setSubmitState({ status: "loading" });

    // Honeypot: treat as success without calling the API.
    if (values.companyWebsite && values.companyWebsite.trim().length > 0) {
      setSubmitState({ status: "success", message: "Thanks — we’ll be in touch shortly." });
      trackEvent("contact_submit", { result: "honeypot" });
      reset();
      return;
    }

    try {
      if (!token) throw new Error("Please verify first.");

      await submitContactAuthed(token, {
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        subject: values.subject,
        message: values.message,
        honeypot: values.companyWebsite || undefined,
      });
      setSubmitState({ status: "success", message: "Message sent. We’ll respond within 1 business day." });
      trackEvent("contact_submit", { result: "success" });
      reset();
    } catch (e: any) {
      setSubmitState({
        status: "error",
        message: typeof e?.message === "string" ? e.message : "Something went wrong. Please try again.",
      });
      trackEvent("contact_submit", { result: "error" });
    }
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Email Us",
      content: siteConfig.contact.email,
    },
    {
      icon: Phone,
      title: "Call Us",
      content: siteConfig.contact.phone,
    },
    {
      icon: MapPin,
      title: "Visit Us",
      content: addressLine || "India",
    },
    {
      icon: Clock,
      title: "Working Hours",
      content: "Mon - Fri: 9:00 AM - 6:00 PM",
      subContent: "Sat - Sun: Closed",
    },
  ];

  return (
    <div className="min-h-screen">
      <Seo
        title="Contact"
        description="Contact HZ IT Company to discuss your project. Tell us your goals and we’ll respond within 1 business day with clear next steps."
        path="/contact"
      />
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 text-white overflow-hidden">
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
              Get In Touch
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
              Have a question or ready to start your project? We'd love to hear from you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {contactInfo.map((info, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/70 backdrop-blur-lg rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 min-h-[180px] flex flex-col border border-white/40 overflow-visible"
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mb-4 flex-shrink-0 overflow-visible">
                  <info.icon className="text-white" size={28} />
                </div>
                <h3
                  className="text-lg font-bold mb-2 text-gray-900 font-poppins"
                >
                  {info.title}
                </h3>
                <p className="text-gray-700 text-sm font-medium">{info.content}</p>
                {info.subContent ? <p className="text-gray-500 text-sm">{info.subContent}</p> : null}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Map Section */}
      <section className="pb-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mr-4">
                    <MessageSquare className="text-white" size={24} />
                  </div>
                  <div>
                    <h2
                      className="text-3xl font-bold text-gray-900 font-poppins"
                    >
                      Send Us a Message
                    </h2>
                    <p className="text-gray-600">We'll respond within 24 hours</p>
                  </div>
                </div>

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
                    {submitState.message ?? (submitState.status === "loading" ? "Sending…" : "")}
                  </div>
                ) : null}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                  <div className="sr-only" aria-hidden="true">
                    <label htmlFor="companyWebsite">Company Website</label>
                    <input id="companyWebsite" type="text" tabIndex={-1} autoComplete="off" {...register("companyWebsite")} />
                  </div>

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      autoComplete="name"
                      {...register("name")}
                      className={
                        "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                        (errors.name ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                      }
                      placeholder="John Doe"
                    />
                    {errors.name ? (
                      <p className="mt-2 text-sm text-rose-700">{errors.name.message}</p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        autoComplete="email"
                        inputMode="email"
                        {...register("email")}
                        className={
                          "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                          (errors.email ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                        }
                        placeholder="john@example.com"
                      />
                      {errors.email ? (
                        <p className="mt-2 text-sm text-rose-700">{errors.email.message}</p>
                      ) : null}
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        autoComplete="tel"
                        inputMode="tel"
                        {...register("phone")}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all"
                        placeholder="+91 8101515185"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                      Subject *
                    </label>
                    <select
                      id="subject"
                      {...register("subject")}
                      className={
                        "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-600/20 " +
                        (errors.subject ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                      }
                    >
                      <option value="">Select a subject</option>
                      <option value="general">General Inquiry</option>
                      <option value="project">New Project</option>
                      <option value="support">Technical Support</option>
                      <option value="partnership">Partnership</option>
                    </select>
                    {errors.subject ? (
                      <p className="mt-2 text-sm text-rose-700">{errors.subject.message}</p>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      rows={6}
                      {...register("message")}
                      className={
                        "w-full px-4 py-3 rounded-xl border outline-none transition-all resize-none focus:ring-2 focus:ring-blue-600/20 " +
                        (errors.message ? "border-rose-300 focus:border-rose-500" : "border-gray-300 focus:border-blue-600")
                      }
                      placeholder="Tell us about your project or inquiry..."
                    />
                    {errors.message ? (
                      <p className="mt-2 text-sm text-rose-700">{errors.message.message}</p>
                    ) : null}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={
                      "w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg transition-all duration-200 flex items-center justify-center " +
                      (isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:shadow-xl hover:scale-[1.02]")
                    }
                  >
                    {isSubmitting ? "Sending…" : "Send Message"}
                    <Send size={18} className="ml-2" />
                  </button>

                  <a href="/" className="block text-center text-sm text-gray-600 hover:underline">
                    Back to website
                  </a>
                </form>
              </div>
            </motion.div>

            {/* Map & Additional Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              {/* Map */}
              <div className="bg-white rounded-3xl overflow-hidden shadow-xl">
                <div className="aspect-video bg-gradient-to-br from-blue-600 to-blue-800 relative">
                  <iframe
                    title="Office Location"
                    src="https://www.google.com/maps?q=India&output=embed"
                    width="100%"
                    height="100%"
                    allowFullScreen
                    loading="lazy"
                    className="absolute inset-0 border-0"
                  />
                </div>
              </div>

              {/* Why Choose Us */}
              <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 rounded-3xl p-8 text-white shadow-xl">
                <h3
                  className="text-2xl font-bold mb-6 font-poppins"
                >
                  Why Choose HZ IT Company?
                </h3>
                <ul className="space-y-4">
                  {[
                    "15+ years of industry experience",
                    "500+ successful projects delivered",
                    "98% client satisfaction rate",
                    "24/7 dedicated support team",
                    "Agile development methodology",
                    "Competitive pricing",
                  ].map((item, index) => (
                    <li key={index} className="flex items-start">
                      <div className="w-6 h-6 rounded-full bg-blue-400 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <span className="text-blue-100">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2
              className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 font-poppins"
            >
              Ready to Start Your Project?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Let's discuss how we can help bring your vision to life.
            </p>
            <CTAButton to="/hire-us">Get Started Today</CTAButton>
          </motion.div>
        </div>
      </section>
    </div>
  );
}