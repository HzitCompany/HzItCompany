import { MessageCircle } from "lucide-react";
import { siteConfig } from "@/app/config/site";
import { trackEvent } from "@/app/analytics/track";

export function FloatingWhatsApp() {
  const digits = siteConfig.contact.whatsapp.replace(/\D/g, "");
  const waDigits = digits.length === 10 ? `91${digits}` : digits;
  const href = `https://wa.me/${waDigits}?text=${encodeURIComponent(
    "Hi HZ IT Company — I’d like to discuss a project."
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with HZ IT Company on WhatsApp"
      onClick={() => trackEvent("whatsapp_click", { placement: "floating" })}
      className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600/40"
    >
      <MessageCircle size={18} />
      <span className="text-sm font-semibold">WhatsApp</span>
    </a>
  );
}
