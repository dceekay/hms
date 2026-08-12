const siteUrl = "https://www.mdshospital.com.ng";
const defaultImage = `${siteUrl}/mds-hospital-og.jpg`;

type SeoInput = {
  title: string;
  description: string;
  canonicalPath: string;
  keywords?: string;
  image?: string;
  type?: "website" | "article";
  jsonLd?: Record<string, unknown>;
};

function upsertMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`
  );

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.content = content;
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }

  element.href = href;
}

function upsertJsonLd(jsonLd?: Record<string, unknown>) {
  const id = "route-json-ld";
  const existing = document.getElementById(id);

  if (!jsonLd) {
    existing?.remove();
    return;
  }

  const element =
    (existing as HTMLScriptElement | null) ?? document.createElement("script");
  element.id = id;
  element.type = "application/ld+json";
  element.textContent = JSON.stringify(jsonLd);

  if (!existing) {
    document.head.appendChild(element);
  }
}

export function applySeo({
  title,
  description,
  canonicalPath,
  keywords,
  image = defaultImage,
  type = "website",
  jsonLd,
}: SeoInput) {
  const canonical = `${siteUrl}${canonicalPath}`;

  document.title = title;
  upsertCanonical(canonical);

  upsertMeta("name", "description", description);
  upsertMeta("name", "robots", "index, follow");

  if (keywords) {
    upsertMeta("name", "keywords", keywords);
  }

  upsertMeta("property", "og:type", type);
  upsertMeta("property", "og:url", canonical);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:image", image);
  upsertMeta("property", "og:site_name", "MDS Hospital");

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  upsertMeta("name", "twitter:image", image);

  upsertJsonLd(jsonLd);
}

export const seoSiteUrl = siteUrl;
