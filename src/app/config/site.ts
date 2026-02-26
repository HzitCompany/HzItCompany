export const siteConfig = {
  name: "HZ IT Company",
  legalName: "HZ IT Company",
  url: "https://www.hzitcompany.com",
  tagline: "IT services and software development for growing teams in India",
  defaultTitle: "HZ IT Company | IT Services & Software Development in India",
  defaultDescription: "HZ IT Company — Registered MSME IT company in Bihar, India. Custom web development, mobile apps, cloud, cybersecurity & digital marketing. Trusted by businesses across India.",
  locale: "en_IN",
  themeColor: "#2563eb",
  contact: {
    email: "hzitcompany@gmail.com",
    phone: "+91 8101515185",
    whatsapp: "+91 8101515185",
  },
  address: {
    streetAddress: "Bihar",
    addressLocality: "Patna",
    addressRegion: "Bihar",
    postalCode: "800001",
    addressCountry: "IN",
  },
  socials: {
    instagram: "https://www.instagram.com/hzitcompany?igsh=MXZkaXh0OGo3cGdzcg==",
    x: "https://x.com/hzitcompany",
    facebook: "https://www.facebook.com/share/1av6JvLBCq/",
    youtube: "https://youtube.com/@hzitcompany?si=2_3dECFCpkkOgNpr",
    linkedin: "https://www.linkedin.com/in/hzitcompany?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app",
  },
  defaultOgImage: "/og-image.png",
} as const;

export type SiteConfig = typeof siteConfig;
