export const siteConfig = {
  name: "HZ IT Company",
  legalName: "HZ IT Company",
  url: "https://hzitcompany.com",
  tagline: "IT services and software development for growing teams",
  defaultTitle: "HZ IT Company | IT Services & Software Development",
  defaultDescription:
    "HZ IT Company builds secure, high-performance web and mobile products. We provide custom software development, cloud, cybersecurity, UI/UX, and IT consulting.",
  locale: "en_IN",
  themeColor: "#2563eb",
  contact: {
    email: "Hzitcompany@gmail.com",
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
    linkedin: "https://www.linkedin.com/company/hz-it-company",
    twitter: "https://twitter.com/hzitcompany",
    github: "https://github.com/hzitcompany",
  },
  // Put a real hosted image in /public for best SEO. This path assumes you add it later.
  defaultOgImage: "/og-image.png",
} as const;

export type SiteConfig = typeof siteConfig;
