import { useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import {
  Code,
  Smartphone,
  Cloud,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  Star,
  Clock,
} from "lucide-react";
import { ServiceCard } from "../components/ServiceCard";
import { CTAButton } from "../components/CTAButton";
import { Seo } from "../components/Seo";
import { siteConfig } from "../config/site";
import { CmsSlot } from "../components/cms/CmsBlocks";

export function Home() {
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHover, setFeedbackHover] = useState(0);
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackDone, setFeedbackDone] = useState(false);

  function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackRating || !feedbackName.trim() || !feedbackMsg.trim()) return;
    setFeedbackDone(true);
  }

  const services = [
    {
      icon: Code,
      title: "Web Development",
      description: "Custom web applications built with modern technologies",
      features: ["React & Next.js", "Responsive Design", "SEO Optimized"],
    },
    {
      icon: Smartphone,
      title: "Mobile Apps",
      description: "Native and cross-platform mobile solutions",
      features: ["iOS & Android", "React Native", "User-Centric Design"],
    },
    {
      icon: Cloud,
      title: "Cloud Solutions",
      description: "Scalable cloud infrastructure and migration services",
      features: ["AWS & Azure", "DevOps", "Auto Scaling"],
    },
    {
      icon: Lightbulb,
      title: "IT Consulting",
      description: "Strategic technology consulting for digital transformation",
      features: ["Digital Strategy", "Tech Stack", "Process Optimization"],
    },
  ];

  const stats = [
    { label: "Projects Completed" },
    { label: "Client Satisfaction" },
    { label: "Team Members" },
    { label: "Years Experience" },
  ];

  const portfolioProjects = [
    { id: 1, title: "E-Commerce Platform", category: "Web Development" },
    { id: 2, title: "Healthcare App", category: "Mobile Development" },
    { id: 3, title: "Financial Dashboard", category: "Cloud Solutions" },
  ];

  return (
    <div className="min-h-screen">
      <Seo
        title="Premium IT Services"
        description="HZ IT Company helps teams ship reliable software faster. Custom web and mobile development, cloud, cybersecurity, UI/UX, and consulting."
        keywords="HZ IT Company, hz it company, hzitcompany, hz it, IT company India, web development India, AI solutions India, digital marketing India, software development India, cybersecurity India, mobile app development India, UI UX design India"
        path="/"
        schema={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: siteConfig.legalName,
          url: siteConfig.url,
          telephone: siteConfig.contact.phone,
          email: siteConfig.contact.email,
          address: {
            "@type": "PostalAddress",
            streetAddress: siteConfig.address.streetAddress,
            addressLocality: siteConfig.address.addressLocality,
            addressRegion: siteConfig.address.addressRegion,
            postalCode: siteConfig.address.postalCode,
            addressCountry: siteConfig.address.addressCountry,
          },
          sameAs: [
            siteConfig.socials.linkedin,
            siteConfig.socials.instagram,
            siteConfig.socials.x,
            siteConfig.socials.facebook,
            siteConfig.socials.youtube,
          ],
        }}
      />
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-start md:items-center justify-center overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 pt-[calc(5rem+env(safe-area-inset-top))] md:pt-[calc(6rem+env(safe-area-inset-top))]">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [90, 0, 90],
            }}
            transition={{ duration: 15, repeat: Infinity }}
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1
              className="text-4xl md:text-6xl font-bold mb-6 text-white leading-tight font-poppins"
            >
              Transform Your Business
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">
                With Digital Excellence
              </span>
            </h1>

            <p className="text-lg md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto">
              We deliver cutting-edge IT solutions that drive innovation, efficiency, and growth for businesses worldwide.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <CTAButton to="/hire-us" variant="primary">
                Get Started
              </CTAButton>
              <CTAButton to="/portfolio" variant="secondary">
                View Our Work
              </CTAButton>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mt-10 md:mt-14 max-w-5xl mx-auto"
          >
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 flex flex-col items-center gap-2"
              >
                <Clock size={20} className="text-blue-300" />
                <div className="text-sm font-bold text-blue-200 tracking-widest uppercase">Coming Soon</div>
                <div className="text-gray-300 text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
            <div className="w-1 h-3 bg-white/50 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Client Logos */}
      <section className="py-10 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 mb-6">
            Trusted by product teams across SaaS, healthcare, logistics, and fintech
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-center">
            {[
              "Northwind",
              "BluePeak",
              "Harborline",
              "Vertex Health",
              "LedgerOps",
              "RouteIQ",
            ].map((name) => (
              <div
                key={name}
                className="h-12 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-700 font-semibold"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2
              className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 font-poppins"
            >
              Our Services
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive IT solutions tailored to your business needs
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <ServiceCard
                key={index}
                icon={service.icon}
                title={service.title}
                description={service.description}
                features={service.features}
                delay={index * 0.1}
              />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/services"
              className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors"
            >
              Explore All Services
              <ArrowRight size={20} className="ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Admin-managed page blocks */}
      <CmsSlot contentKey="page.home" />

      {/* Portfolio Preview Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2
              className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 font-poppins"
            >
              Featured Projects
            </h2>
            <p className="text-xl text-gray-600">
              Delivering exceptional results for our clients
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center justify-center py-20 px-8 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center mb-6"
            >
              <Clock size={36} className="text-blue-500" />
            </motion.div>
            <h3 className="text-2xl font-bold text-gray-900 font-poppins">Portfolio Coming Soon</h3>
            <p className="mt-3 text-gray-500 max-w-md text-center">
              Our portfolio is being curated. Exciting case studies and project showcases are on their way!
            </p>
            <Link
              to="/portfolio"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              Visit Portfolio <ArrowRight size={18} />
            </Link>
          </motion.div>

          <div className="text-center mt-12">
            <CTAButton to="/portfolio">View All Projects</CTAButton>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2
              className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 font-poppins"
            >
              What Our Clients Say
            </h2>
            <p className="text-xl text-gray-600">
              Trusted by businesses worldwide
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Coming Soon Reviews Placeholder */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-3xl border-2 border-dashed border-gray-200 bg-white p-10 flex flex-col items-center justify-center text-center min-h-[340px]"
            >
              <motion.div
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="text-5xl mb-5"
              >
                ⭐
              </motion.div>
              <h3 className="text-xl font-bold text-gray-900 font-poppins">Client Reviews Coming Soon</h3>
              <p className="mt-3 text-gray-500 max-w-xs text-sm">
                Real reviews from our clients will appear here. Be the first to share your experience!
              </p>
            </motion.div>

            {/* Feedback Submission Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="rounded-3xl bg-white border border-gray-200 shadow-lg p-8"
            >
              <h3 className="text-xl font-bold text-gray-900 font-poppins">Share Your Feedback</h3>
              <p className="mt-1 text-gray-500 text-sm">Tell us about your experience with our services</p>

              {feedbackDone ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-8 flex flex-col items-center text-center py-8"
                >
                  <div className="text-4xl mb-3">🙏</div>
                  <h4 className="text-lg font-bold text-gray-900">Thank you, {feedbackName}!</h4>
                  <p className="mt-2 text-gray-500 text-sm">Your feedback has been received. We appreciate your time!</p>
                </motion.div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="mt-6 grid gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={feedbackName}
                      onChange={(e) => setFeedbackName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Your Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                          onClick={() => setFeedbackRating(star)}
                          onMouseEnter={() => setFeedbackHover(star)}
                          onMouseLeave={() => setFeedbackHover(0)}
                          className="focus:outline-none"
                        >
                          <Star
                            size={30}
                            className={`transition-colors ${
                              star <= (feedbackHover || feedbackRating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "fill-gray-200 text-gray-200"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Experience</label>
                    <textarea
                      required
                      rows={4}
                      value={feedbackMsg}
                      onChange={(e) => setFeedbackMsg(e.target.value)}
                      placeholder="Share what you loved about working with us…"
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!feedbackRating}
                    className="w-full rounded-xl bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Submit Feedback
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 text-white relative overflow-hidden">
        {/* Glass Effect Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-lg p-10 md:p-12 transition-colors duration-300 hover:bg-white/10">
              <p className="text-sm font-semibold tracking-wider text-blue-200 uppercase mb-4">
                Let’s build something great
              </p>
              <h2
                className="text-4xl md:text-5xl font-bold mb-6 font-poppins"
              >
                Ready to Start Your Project?
              </h2>
              <p className="text-xl text-gray-200 mb-8">
                Let’s discuss how we can help transform your business with innovative IT solutions.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <CTAButton
                  to="/hire-us"
                  variant="primary"
                  className="hover:brightness-110"
                >
                  Hire Us Now
                </CTAButton>
                <CTAButton
                  to="/contact"
                  variant="secondary"
                  className="border-white/30 hover:bg-white/25"
                >
                  Contact Us
                </CTAButton>
              </div>

              <p className="mt-3 text-sm text-gray-300">
                We respond within 24 hours.
              </p>

              {/* Trust Indicators */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
                {["24/7 Support", "Money-Back Guarantee", "Agile Process", "NDA Protection"].map(
                  (item, index) => (
                    <div key={index} className="flex flex-col items-center bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 transition-transform duration-300 hover:-translate-y-0.5">
                      <CheckCircle2 className="text-blue-400 mb-2" size={24} />
                      <span className="text-sm text-gray-300">{item}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}