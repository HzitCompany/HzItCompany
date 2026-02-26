import { Helmet } from "react-helmet-async";
import { siteConfig } from "@/app/config/site";

type SeoProps = {
  title?: string;
  description?: string;
  keywords?: string;
  author?: string;
  path?: string;
  canonicalUrl?: string;
  ogImage?: string;
  noIndex?: boolean;
  schema?: Record<string, unknown>;
};

function absoluteUrl(pathOrUrl: string) {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  return `${siteConfig.url}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function Seo({
  title,
  description,
  keywords,
  author,
  path,
  canonicalUrl,
  ogImage,
  noIndex,
  schema,
}: SeoProps) {
  const computedTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.defaultTitle;
  const computedDescription = description ?? siteConfig.defaultDescription;
  const computedKeywords =
    keywords ??
    "HZ IT Company, hz it company, hzitcompany, hz it, IT company India, IT company Bihar, IT company Patna, web development India, software development India, mobile app development India, cloud solutions India, cybersecurity India, digital marketing India, MSME IT company India, custom software India";
  const computedAuthor = author ?? siteConfig.name;

  const canonical = canonicalUrl
    ? canonicalUrl
    : path
      ? absoluteUrl(path)
      : siteConfig.url;

  const image = absoluteUrl(ogImage ?? siteConfig.defaultOgImage);

  const sameAs = [
    siteConfig.socials.instagram,
    siteConfig.socials.x,
    siteConfig.socials.facebook,
    siteConfig.socials.youtube,
    siteConfig.socials.linkedin,
  ].filter((value): value is NonNullable<typeof value> => Boolean(value)) as string[];

  const computedSchema =
    schema ??
    ({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": ["Organization", "LocalBusiness"],
          "@id": `${siteConfig.url}/#organization`,
          name: siteConfig.legalName,
          url: siteConfig.url,
          email: siteConfig.contact.email,
          telephone: siteConfig.contact.phone,
          description: siteConfig.defaultDescription,
          sameAs,
          address: {
            "@type": "PostalAddress",
            streetAddress: siteConfig.address.streetAddress,
            addressLocality: siteConfig.address.addressLocality,
            addressRegion: siteConfig.address.addressRegion,
            postalCode: siteConfig.address.postalCode,
            addressCountry: siteConfig.address.addressCountry,
          },
          areaServed: [
            { "@type": "Country", name: "India" },
            { "@type": "State", name: "Bihar" },
          ],
          knowsAbout: [
            "Web Development",
            "Mobile App Development",
            "Cloud Solutions",
            "Cybersecurity",
            "Digital Marketing",
            "IT Consulting",
            "Software Development",
          ],
        },
        {
          "@type": "WebSite",
          "@id": `${siteConfig.url}/#website`,
          url: siteConfig.url,
          name: siteConfig.name,
          inLanguage: "en-IN",
          publisher: {
            "@id": `${siteConfig.url}/#organization`
          },
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${siteConfig.url}/?q={search_term_string}`
            },
            "query-input": "required name=search_term_string"
          }
        },
        {
          "@type": "WebPage",
          "@id": `${canonical}#webpage`,
          url: canonical,
          name: computedTitle,
          description: computedDescription,
          isPartOf: { "@id": `${siteConfig.url}/#website` },
          about: { "@id": `${siteConfig.url}/#organization` },
          inLanguage: "en-IN",
        }
      ]
    } satisfies Record<string, unknown>);

  return (
    <Helmet>
      <title>{computedTitle}</title>
      <meta name="description" content={computedDescription} />
      <meta name="keywords" content={computedKeywords} />
      <meta name="author" content={computedAuthor} />
      <meta name="application-name" content={siteConfig.name} />
      <meta name="theme-color" content={siteConfig.themeColor} />

      {/* Geo targeting — helps Google associate the site with India/Bihar */}
      <meta name="geo.region" content="IN-BR" />
      <meta name="geo.placename" content="Patna, Bihar, India" />
      <meta name="geo.position" content="25.5941;85.1376" />
      <meta name="ICBM" content="25.5941, 85.1376" />

      {/* Language */}
      <meta httpEquiv="content-language" content="en-IN" />

      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:site_name" content={siteConfig.name} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={computedTitle} />
      <meta property="og:description" content={computedDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content={siteConfig.locale} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@hzitcompany" />
      <meta name="twitter:creator" content="@hzitcompany" />
      <meta name="twitter:title" content={computedTitle} />
      <meta name="twitter:description" content={computedDescription} />
      <meta name="twitter:image" content={image} />

      {noIndex ? <meta name="robots" content="noindex, nofollow" /> : <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />}

      <script type="application/ld+json">{JSON.stringify(computedSchema)}</script>
    </Helmet>
  );
}
