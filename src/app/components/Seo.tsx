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
  const computedKeywords = keywords ?? "IT company India, web development, AI services, digital marketing";
  const computedAuthor = author ?? siteConfig.name;

  const canonical = canonicalUrl
    ? canonicalUrl
    : path
      ? absoluteUrl(path)
      : siteConfig.url;

  const image = absoluteUrl(ogImage ?? siteConfig.defaultOgImage);

  const computedSchema =
    schema ??
    ({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      sameAs: siteConfig.socials.linkedin ? [siteConfig.socials.linkedin] : []
    } satisfies Record<string, unknown>);

  return (
    <Helmet>
      <title>{computedTitle}</title>
      <meta name="description" content={computedDescription} />
      <meta name="keywords" content={computedKeywords} />
      <meta name="author" content={computedAuthor} />

      <link rel="canonical" href={canonical} />

      <meta property="og:site_name" content={siteConfig.name} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={computedTitle} />
      <meta property="og:description" content={computedDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content={siteConfig.locale} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={computedTitle} />
      <meta name="twitter:description" content={computedDescription} />
      <meta name="twitter:image" content={image} />

      {noIndex ? <meta name="robots" content="noindex, nofollow" /> : null}

      <script type="application/ld+json">{JSON.stringify(computedSchema)}</script>
    </Helmet>
  );
}
