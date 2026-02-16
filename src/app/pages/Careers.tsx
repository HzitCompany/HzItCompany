import { Seo } from "../components/Seo";
import { siteConfig } from "../config/site";
import { motion } from "motion/react";

export function Careers() {
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/40">
                <h2 className="text-2xl font-bold text-gray-900 font-poppins">Open roles</h2>
                <ul className="mt-5 grid gap-3 text-gray-700">
                  <li className="rounded-xl bg-white border border-gray-200 px-4 py-3">
                    <div className="font-semibold text-gray-900">Frontend Developer</div>
                    <div className="text-sm text-gray-600">React • TypeScript • Tailwind</div>
                  </li>
                  <li className="rounded-xl bg-white border border-gray-200 px-4 py-3">
                    <div className="font-semibold text-gray-900">Backend Developer</div>
                    <div className="text-sm text-gray-600">Node/Express • PostgreSQL • APIs</div>
                  </li>
                  <li className="rounded-xl bg-white border border-gray-200 px-4 py-3">
                    <div className="font-semibold text-gray-900">UI/UX Designer</div>
                    <div className="text-sm text-gray-600">Figma • Design systems • Web UX</div>
                  </li>
                  <li className="rounded-xl bg-white border border-gray-200 px-4 py-3">
                    <div className="font-semibold text-gray-900">Sales / Business Development</div>
                    <div className="text-sm text-gray-600">Lead generation • Client communication</div>
                  </li>
                </ul>
                <p className="mt-4 text-sm text-gray-600">If you don’t see your role, still apply with your preferred position.</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 font-poppins">How to apply</h2>
                <p className="mt-3 text-gray-600">Send your resume/CV and a short message about the role you want.</p>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <a
                    href={mailtoHref}
                    className="min-h-11 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    Apply via Email
                  </a>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-11 inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                  >
                    WhatsApp Us
                  </a>
                </div>

                <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                  <div className="font-semibold text-gray-900">Contact</div>
                  <div className="mt-1">
                    Email: <a className="text-blue-700 hover:underline" href={`mailto:${email}`}>{email}</a>
                  </div>
                  <div>
                    Phone:{" "}
                    <a
                      className="text-blue-700 hover:underline"
                      href={phoneDigits.length === 10 ? `tel:+91${phoneDigits}` : phoneDigits ? `tel:+${phoneDigits}` : undefined}
                    >
                      {siteConfig.contact.phone}
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
