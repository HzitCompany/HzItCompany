import { Link } from "react-router";
import { Mail, Phone, MapPin, Linkedin, Twitter, Instagram, Facebook, Youtube } from "lucide-react";
import logoImage from "../../assets/d02f6d670ee484ccb5b3f98463b90941b5d1ead6.png";
import { siteConfig } from "@/app/config/site";
import { useAuthGuard } from "../auth/useAuthGuard";

export function Footer() {
  const { guardNavigate } = useAuthGuard();
  const phoneDigits = siteConfig.contact.phone.replace(/\D/g, "");
  const telHref = phoneDigits.length === 10 ? `tel:+91${phoneDigits}` : `tel:+${phoneDigits}`;
  const addressText = [
    siteConfig.address.streetAddress,
    siteConfig.address.addressLocality,
    siteConfig.address.addressRegion,
    siteConfig.address.postalCode,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center mb-4">
              <div className="h-12 w-12 rounded-2xl overflow-hidden">
                <img
                  src={logoImage}
                  alt="HZ IT Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <h3
                className="ml-3 text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent font-poppins"
              >
                HZ IT Company
              </h3>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Transforming businesses through innovative IT solutions and digital excellence.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href={siteConfig.socials.instagram}
                target="_blank"
                rel="noreferrer"
                aria-label="HZ IT Company on Instagram"
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-blue-600 transition-all duration-200 hover:scale-110"
              >
                <Instagram size={18} />
              </a>
              <a
                href={siteConfig.socials.x}
                target="_blank"
                rel="noreferrer"
                aria-label="HZ IT Company on X"
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-blue-600 transition-all duration-200 hover:scale-110"
              >
                <Twitter size={18} />
              </a>
              <a
                href={siteConfig.socials.facebook}
                target="_blank"
                rel="noreferrer"
                aria-label="HZ IT Company on Facebook"
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-blue-600 transition-all duration-200 hover:scale-110"
              >
                <Facebook size={18} />
              </a>
              <a
                href={siteConfig.socials.youtube}
                target="_blank"
                rel="noreferrer"
                aria-label="HZ IT Company on YouTube"
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-blue-600 transition-all duration-200 hover:scale-110"
              >
                <Youtube size={18} />
              </a>
              <a
                href={siteConfig.socials.linkedin}
                target="_blank"
                rel="noreferrer"
                aria-label="HZ IT Company on LinkedIn"
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-blue-600 transition-all duration-200 hover:scale-110"
              >
                <Linkedin size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 font-poppins">
              Quick Links
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-blue-400 transition-colors text-sm">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-300 hover:text-blue-400 transition-colors text-sm">
                  About
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-gray-300 hover:text-blue-400 transition-colors text-sm">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/portfolio" className="text-gray-300 hover:text-blue-400 transition-colors text-sm">
                  Portfolio
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => guardNavigate("/careers")}
                  className="text-gray-300 hover:text-blue-400 transition-colors text-sm"
                >
                  Careers
                </button>
              </li>
              <li>
                <Link to="/admin/login" className="text-gray-300 hover:text-blue-400 transition-colors text-sm">
                  Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold mb-4 font-poppins">
              Our Services
            </h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>Web Development</li>
              <li>Mobile Apps</li>
              <li>Cloud Solutions</li>
              <li>IT Consulting</li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4 font-poppins">
              Contact Us
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3 text-sm text-gray-300">
                <Mail size={18} className="mt-0.5 flex-shrink-0 text-blue-400" />
                <a className="hover:text-blue-300 transition-colors" href={`mailto:${siteConfig.contact.email}`}>
                  {siteConfig.contact.email}
                </a>
              </li>
              <li className="flex items-start space-x-3 text-sm text-gray-300">
                <Phone size={18} className="mt-0.5 flex-shrink-0 text-blue-400" />
                <a className="hover:text-blue-300 transition-colors" href={telHref}>
                  {siteConfig.contact.phone}
                </a>
              </li>
              <li className="flex items-start space-x-3 text-sm text-gray-300">
                <MapPin size={18} className="mt-0.5 flex-shrink-0 text-blue-400" />
                <span>{addressText}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-sm text-gray-400">
          <div className="flex items-center justify-center gap-3">
            <div className="h-8 w-8 rounded-lg overflow-hidden bg-white/10">
              <img src={logoImage} alt="HZ IT Logo" className="h-full w-full object-contain" />
            </div>
            <p>&copy; 2026 HZ IT Company. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}