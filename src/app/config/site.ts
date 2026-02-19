export const siteConfig = {
  name: "HZ IT Company",
  legalName: "HZ IT Company",
  url: "https://hzitcompany.com",
  tagline: "IT services and software development for growing teams",
  defaultTitle: "HZ IT Company | IT Services & Software Development",
  defaultDescription: "HZ IT Company — Web, AI, Cloud & Digital Solutions in India",
  locale: "en_IN",
  themeColor: "#2563eb",
  contact: {
    email: "hzitcompany@gmail.com",
    phone: "+91 8101515185",
    whatsapp: "+91 8101515185",
  },
  address: {
    streetAddress: "India",
    addressLocality: "India",
    addressRegion: "",
    postalCode: "",
    addressCountry: "IN",
  },
  socials: {
    instagram: "https://www.instagram.com/hzitcompany/",
    x: "https://x.com/hzitcompany",
    facebook: "https://www.facebook.com/share/1av6JvLBCq/",
    youtube: "https://youtube.com/@hzitcompany?si=2_3dECFCpkkOgNpr",
    linkedin: "https://www.linkedin.com/in/hzitcompany?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app",
  },
  // Put a real hosted image in /public for best SEO. This path assumes you add it later.
  defaultOgImage: "/og-image.png",
} as const;

export type SiteConfig = typeof siteConfig;
