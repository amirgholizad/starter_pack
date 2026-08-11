// Centralized SEO: root metadata, the per-page metadata builder, and JSON-LD
// structured data. Pages re-export what they need — Next.js only requires that
// the `metadata` object is exported from the page/layout module itself.
//
// BUILD AGENT: fill in the title/description/offer values from the brief, and
// pick the right schema.org type in `businessJsonLd` (see the note there).
import type { Metadata } from "next";
import { site, siteUrl, routes } from "@/lib/constants";

export const defaultDescription =
  "One or two sentences describing what the business does, who it serves, and where — written for search results, not for the page.";

const defaultTitle = `${site.name} | What they do in City, Region`;

export const rootMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: `%s | ${site.name}`,
  },
  description: defaultDescription,
  alternates: { canonical: routes.home },
  openGraph: {
    type: "website",
    locale: "en_CA",
    siteName: site.name,
    title: defaultTitle,
    description: defaultDescription,
    url: routes.home,
    images: [
      {
        url: "/images/og.jpg",
        width: 1200,
        height: 630,
        alt: `${site.name}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
  // KEEP THIS. iOS Safari auto-linkifies phone numbers, dates, and addresses in
  // plain text, which mutates the DOM before React hydrates and causes a
  // hydration mismatch — on iOS only, so it survives desktop and Android
  // testing. Every local-business site has a phone number in its markup, so
  // this recurs on every client. Ship real `tel:`/`mailto:` links instead.
  formatDetection: { telephone: false, date: false, address: false, email: false },
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/favicon.svg",
  },
};

interface PageMetadataInput {
  title: string;
  description: string;
  /** Route path, e.g. routes.services — becomes the canonical and og:url. */
  path: string;
}

export function buildPageMetadata({ title, description, path }: PageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | ${site.name}`,
      description,
      url: path,
    },
  };
}

// LocalBusiness structured data so Google can show the business in local results
// (knowledge panel, maps, rich snippets).
//
// BUILD AGENT: replace "@type" with the most specific schema.org LocalBusiness
// subtype that fits the client — e.g. DrivingSchool, Dentist, Plumber,
// HairSalon, Restaurant, AutoRepair. Browse the list at
// https://schema.org/LocalBusiness. Leave it as "LocalBusiness" only if no
// subtype fits. Drop any field the brief doesn't give you a real value for —
// never invent an address, price range, or offer.
export const businessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: site.name,
  url: siteUrl,
  logo: `${siteUrl}/images/logo.png`,
  image: `${siteUrl}/images/og.jpg`,
  telephone: site.phone,
  email: site.email,
  address: {
    "@type": "PostalAddress",
    addressLocality: "City",
    addressRegion: "Region",
    addressCountry: "CA",
  },
  areaServed: site.location,
};

export function buildFaqJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(item => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
