import { motion } from "motion/react";
import { Link } from "react-router";
import {
  Code,
  Smartphone,
  Cloud,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { ServiceCard } from "../components/ServiceCard";
import { TestimonialSlider } from "../components/TestimonialSlider";
import { CTAButton } from "../components/CTAButton";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Seo } from "../components/Seo";
import { siteConfig } from "../config/site";

export function Home() {
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
    { value: "500+", label: "Projects Completed" },
    { value: "98%", label: "Client Satisfaction" },
    { value: "50+", label: "Team Members" },
    { value: "15+", label: "Years Experience" },
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
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
              >
                <div
                  className="text-4xl font-bold text-white mb-2 font-poppins"
                >
                  {stat.value}
                </div>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {portfolioProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300"
              >
                <div className="aspect-video bg-gradient-to-br from-blue-600 to-blue-800 relative">
                  <ImageWithFallback
                    src={`https://source.unsplash.com/800x600/?technology,${project.category}`}
                    alt={project.title}
                    className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <p className="text-sm text-blue-300 mb-2">{project.category}</p>
                    <h3 className="text-xl font-bold font-poppins">
                      {project.title}
                    </h3>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

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

          <TestimonialSlider />
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