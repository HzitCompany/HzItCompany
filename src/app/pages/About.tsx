import { motion } from "motion/react";
import { Target, Eye, Award, Users, Zap, Shield } from "lucide-react";
import { Seo } from "../components/Seo";
import { CmsSlot } from "../components/cms/CmsBlocks";

export function About() {
  const timeline = [
    { year: "2026", title: "Company Founded", description: "Established with a vision to deliver reliable, affordable, and high-quality digital solutions." },
  ];

  const values = [
    { icon: Zap, title: "Innovation", description: "Embracing cutting-edge technologies" },
    { icon: Shield, title: "Integrity", description: "Transparent and ethical practices" },
    { icon: Users, title: "Collaboration", description: "Partnership-driven approach" },
    { icon: Award, title: "Excellence", description: "Commitment to quality delivery" },
  ];

  const team = [
    { name: "John Anderson", role: "CEO & Founder", experience: "15+ years" },
    { name: "Sarah Williams", role: "CTO", experience: "12+ years" },
    { name: "Michael Brown", role: "Head of Development", experience: "10+ years" },
    { name: "Emily Davis", role: "Design Director", experience: "8+ years" },
  ];

  return (
    <div className="min-h-screen">
      <Seo
        title="About"
        description="Learn how HZ IT Company partners with teams to design, build, and scale secure software—delivered by senior engineers with a product mindset."
        path="/about"
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
              About HZ IT Company
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
              Pioneering digital transformation through innovation, expertise, and unwavering commitment to excellence.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Founder Story */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2
                className="text-4xl font-bold mb-6 text-gray-900 font-poppins"
              >
                A Founder-Led Delivery Culture
              </h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                HZ IT Company was established in 2026 with a vision to provide reliable, affordable, and high-quality digital solutions.
                We work as an extension of your team—planning clearly, shipping iteratively, and measuring success by business outcomes.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Our delivery is founder-led and engineering-driven, with a strong focus on long-term support and transparent communication.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-2xl p-10 text-white">
                <p className="text-blue-100 mb-6 leading-relaxed italic">
                  “Clients don’t hire us for code. They hire us for reliable delivery—done with care, documented decisions, and zero surprises.”
                </p>
                <div>
                  <p className="font-bold font-poppins">
                    Manish Kumar Singh — Founder & CEO
                  </p>
                  <p className="text-blue-200 text-sm">Engineering-led. Product-minded.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Company Story */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2
                className="text-4xl font-bold mb-6 text-gray-900 font-poppins"
              >
                Our Story
              </h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                HZ IT Company was established in 2026 with a vision to provide reliable, affordable, and high-quality digital solutions.
              </p>
              <p className="text-gray-600 mb-4 leading-relaxed">From day one, our focus has been simple: deliver quality work, keep communication clear, and support clients long after launch.</p>
              <p className="text-gray-600 leading-relaxed">Today, we help businesses across India build and scale products with dependable execution and practical guidance.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-2xl" />
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* MSME Registration */}
      <section className="py-14 bg-gradient-to-r from-blue-700 to-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row items-start md:items-center gap-6"
          >
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Award className="text-white" size={36} />
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1 text-sm font-medium mb-3">
                <Shield size={14} />
                Government of India — Registered MSME
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 font-poppins">
                Registered MSME under Government of India
              </h2>
              <p className="text-blue-100 leading-relaxed mb-4 max-w-2xl">
                HZ IT Company is a registered MSME under the Government of India. We are officially registered under
                Udyam Registration (Ministry of MSME), ensuring reliability and professional standards in our services.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
                  <p className="text-xs text-blue-200 mb-0.5">Registered Under</p>
                  <p className="font-semibold text-sm">Ministry of Micro, Small &amp; Medium Enterprises</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
                  <p className="text-xs text-blue-200 mb-0.5">Udyam Registration Number</p>
                  <p className="font-semibold text-sm tracking-wide">UDYAM-BR-03-0042718</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white/70 backdrop-blur-lg rounded-3xl p-10 shadow-lg border border-white/40"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mb-6">
                <Target className="text-white" size={32} />
              </div>
              <h3
                className="text-3xl font-bold mb-4 text-gray-900 font-poppins"
              >
                Our Mission
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Empower businesses with reliable digital solutions and long-term support.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-10 shadow-lg text-white"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
                <Eye className="text-white" size={32} />
              </div>
              <h3
                className="text-3xl font-bold mb-4 font-poppins"
              >
                Our Vision
              </h3>
              <p className="text-blue-100 leading-relaxed">
                Become a trusted IT partner driving digital transformation.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Core Values */}
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
              Our Core Values
            </h2>
            <p className="text-xl text-gray-600">
              The principles that guide everything we do
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <value.icon className="text-white" size={36} />
                </div>
                <h3
                  className="text-xl font-bold mb-2 text-gray-900 font-poppins"
                >
                  {value.title}
                </h3>
                <p className="text-gray-600">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2
              className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 font-poppins"
            >
              Our Journey
            </h2>
            <p className="text-xl text-gray-600">
              Milestones that shaped our success
            </p>
          </motion.div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 top-0 bottom-0 w-0.5 bg-blue-200" />

            {timeline.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`relative mb-12 ${
                  index % 2 === 0 ? "md:text-right md:pr-12" : "md:pl-12 md:ml-auto"
                } md:w-1/2`}
              >
                {/* Timeline Dot */}
                <div className="hidden md:block absolute top-2 w-4 h-4 rounded-full bg-blue-600 shadow-lg ${
                  index % 2 === 0 ? 'right-0 transform translate-x-1/2' : 'left-0 transform -translate-x-1/2'
                }" />

                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div
                    className="text-3xl font-bold text-blue-600 mb-2 font-poppins"
                  >
                    {item.year}
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Team */}
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
              Leadership Team
            </h2>
            <p className="text-xl text-gray-600">
              Meet the experts driving our success
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl"
          >
            <div className="rounded-3xl border border-gray-200 bg-gray-50 px-8 py-10 text-center shadow-sm">
              <div className="text-2xl font-bold text-gray-900 font-poppins">Coming soon</div>
              <p className="mt-2 text-gray-600">We’ll share our leadership team details shortly.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Admin-managed page blocks */}
      <CmsSlot contentKey="page.about" />
    </div>
  );
}