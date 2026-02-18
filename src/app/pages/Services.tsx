import { motion } from "motion/react";
import {
  Code,
  Smartphone,
  Cloud,
  Lightbulb,
  Database,
  Shield,
  Zap,
  BarChart3,
  Globe,
  Cpu,
  Palette,
  Headphones,
} from "lucide-react";
import { ServiceCard } from "../components/ServiceCard";
import { CTAButton } from "../components/CTAButton";
import { Seo } from "../components/Seo";
import { useEffect, useMemo, useState } from "react";
import { fetchPricing, type PricingItem } from "../services/platformService";
import { Link } from "react-router";
import { CmsSlot } from "../components/cms/CmsBlocks";

export function Services() {
  const [pricing, setPricing] = useState<PricingItem[]>([]);
  const [pricingError, setPricingError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchPricing()
      .then((r) => {
        if (!mounted) return;
        setPricing(r.items);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setPricingError(e?.message ?? "Failed to load pricing");
      });

    return () => {
      mounted = false;
    };
  }, []);

  const pricingByService = useMemo(() => {
    const map = new Map<string, { serviceName: string; plans: PricingItem[] }>();
    for (const p of pricing) {
      const key = p.service_key;
      const existing = map.get(key);
      if (existing) {
        existing.plans.push(p);
      } else {
        map.set(key, { serviceName: p.service_name, plans: [p] });
      }
    }
    return Array.from(map.entries()).map(([serviceKey, v]) => {
      const sortedPlans = [...v.plans].sort((a, b) => a.price_inr - b.price_inr);
      const starting = sortedPlans[0];
      return { serviceKey, serviceName: v.serviceName, plans: sortedPlans, starting };
    });
  }, [pricing]);

  const services = [
    {
      icon: Code,
      title: "Web Development",
      description: "Build powerful, scalable web applications with modern frameworks and best practices.",
      features: [
        "React, Next.js, Vue.js development",
        "Progressive Web Apps (PWA)",
        "E-commerce solutions",
        "Custom CMS development",
        "API integration & development",
      ],
    },
    {
      icon: Smartphone,
      title: "Mobile App Development",
      description: "Create seamless mobile experiences for iOS and Android platforms.",
      features: [
        "Native iOS & Android apps",
        "Cross-platform with React Native",
        "Flutter development",
        "App Store optimization",
        "Maintenance & updates",
      ],
    },
    {
      icon: Cloud,
      title: "Cloud Solutions",
      description: "Leverage the power of cloud infrastructure for scalability and performance.",
      features: [
        "AWS, Azure, Google Cloud",
        "Cloud migration services",
        "DevOps & CI/CD pipelines",
        "Serverless architecture",
        "Infrastructure as Code",
      ],
    },
    {
      icon: Database,
      title: "Database Management",
      description: "Design and optimize robust database solutions for your applications.",
      features: [
        "SQL & NoSQL databases",
        "Database design & modeling",
        "Performance optimization",
        "Data migration services",
        "Backup & recovery solutions",
      ],
    },
    {
      icon: Shield,
      title: "Cybersecurity",
      description: "Protect your digital assets with comprehensive security solutions.",
      features: [
        "Security audits & assessments",
        "Penetration testing",
        "SSL/TLS implementation",
        "Data encryption",
        "Compliance consulting",
      ],
    },
    {
      icon: Lightbulb,
      title: "IT Consulting",
      description: "Strategic technology guidance for digital transformation and growth.",
      features: [
        "Digital transformation strategy",
        "Technology stack selection",
        "Process optimization",
        "Architecture design",
        "Project management",
      ],
    },
    {
      icon: Palette,
      title: "UI/UX Design",
      description: "Create beautiful, intuitive user experiences that drive engagement.",
      features: [
        "User research & testing",
        "Wireframing & prototyping",
        "Responsive design",
        "Design systems",
        "Accessibility compliance",
      ],
    },
    {
      icon: BarChart3,
      title: "Data Analytics",
      description: "Transform data into actionable insights for better decision-making.",
      features: [
        "Business intelligence solutions",
        "Data visualization",
        "Predictive analytics",
        "Custom dashboards",
        "Reporting automation",
      ],
    },
    {
      icon: Globe,
      title: "Digital Marketing",
      description: "Boost your online presence with comprehensive digital marketing strategies.",
      features: [
        "SEO optimization",
        "Content marketing",
        "Social media management",
        "Email campaigns",
        "Analytics & reporting",
      ],
    },
    {
      icon: Cpu,
      title: "AI & Machine Learning",
      description: "Harness the power of AI to automate and optimize your business processes.",
      features: [
        "Machine learning models",
        "Natural language processing",
        "Computer vision solutions",
        "Chatbots & virtual assistants",
        "Predictive modeling",
      ],
    },
    {
      icon: Zap,
      title: "Performance Optimization",
      description: "Maximize the speed and efficiency of your applications and infrastructure.",
      features: [
        "Code optimization",
        "Load balancing",
        "Caching strategies",
        "CDN implementation",
        "Performance monitoring",
      ],
    },
    {
      icon: Headphones,
      title: "24/7 Support",
      description: "Round-the-clock technical support to keep your systems running smoothly.",
      features: [
        "Dedicated support team",
        "Incident management",
        "Proactive monitoring",
        "SLA guarantees",
        "Emergency response",
      ],
    },
  ];

  const process = [
    {
      step: "01",
      title: "Discovery",
      description: "We analyze your requirements and define project scope",
    },
    {
      step: "02",
      title: "Planning",
      description: "Strategic roadmap and technical architecture design",
    },
    {
      step: "03",
      title: "Development",
      description: "Agile development with regular progress updates",
    },
    {
      step: "04",
      title: "Testing",
      description: "Rigorous QA to ensure quality and performance",
    },
    {
      step: "05",
      title: "Deployment",
      description: "Smooth launch with minimal downtime",
    },
    {
      step: "06",
      title: "Support",
      description: "Ongoing maintenance and optimization",
    },
  ];

  return (
    <div className="min-h-screen">
      <Seo
        title="Services"
        description="End-to-end IT services: custom software development, cloud, cybersecurity, data analytics, and UI/UX—built to perform and scale."
        path="/services"
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
              Our Services
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
              Comprehensive IT solutions designed to accelerate your business growth and digital transformation.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <ServiceCard
                key={index}
                icon={service.icon}
                title={service.title}
                description={service.description}
                features={service.features}
                delay={index * 0.05}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 font-poppins">
              Pricing
            </h2>
            <p className="mt-3 text-lg text-gray-600">Transparent pricing to help you start fast.</p>
          </div>

          {pricingError ? (
            <div className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {pricingError}
            </div>
          ) : null}

          {pricingByService.length > 0 ? (
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pricingByService.map((s) => (
                <div key={s.serviceKey} className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
                  <div className="text-sm font-medium text-gray-600">{s.serviceName}</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900">
                    Starting from ₹{s.starting.price_inr.toLocaleString("en-IN")}
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-gray-700">
                    {s.plans.slice(0, 3).map((p) => (
                      <div key={p.id} className="flex items-center justify-between">
                        <span>{p.plan_name}</span>
                        <span className="font-semibold">₹{p.price_inr.toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex gap-3">
                    <Link
                      to={`/checkout?pricingId=${s.starting.id}`}
                      className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                      Order Now
                    </Link>
                    <Link
                      to="/hire-us"
                      className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      Hire Us
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-10 text-center text-gray-600">Pricing will appear here once configured.</div>
          )}
        </div>
      </section>

      {/* Process Section */}
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
              Our Process
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A proven methodology that delivers exceptional results
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {process.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative bg-white rounded-2xl p-8 border border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-lg"
              >
                <div
                  className="text-6xl font-bold text-blue-100 mb-4 font-poppins"
                >
                  {item.step}
                </div>
                <h3
                  className="text-2xl font-bold mb-3 text-gray-900 font-poppins"
                >
                  {item.title}
                </h3>
                <p className="text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technologies Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
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
              Technologies We Use
            </h2>
            <p className="text-xl text-gray-600">
              Cutting-edge tools and frameworks
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {[
              "React",
              "Node.js",
              "Python",
              "AWS",
              "Docker",
              "Kubernetes",
              "MongoDB",
              "PostgreSQL",
              "React Native",
              "Next.js",
              "TypeScript",
              "GraphQL",
            ].map((tech, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.1 }}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
              >
                <span className="font-semibold text-gray-700 text-center">{tech}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2
              className="text-4xl md:text-5xl font-bold mb-6 font-poppins"
            >
              Let's Build Something Amazing
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Ready to transform your business with our expert IT services?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <CTAButton to="/hire-us" variant="primary">
                Start Your Project
              </CTAButton>
              <CTAButton to="/contact" variant="secondary">
                Schedule a Consultation
              </CTAButton>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Admin-managed page blocks */}
      <CmsSlot contentKey="page.services" />
    </div>
  );
}
