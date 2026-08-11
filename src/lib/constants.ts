// Centralized site constants — import these instead of hardcoding routes,
// phone numbers, or emails across components.
//
// BUILD AGENT: fill every value below from the client's brief (§2 brand, §5
// contact details) and prune `routes` down to the pages you actually build.

// Canonical production origin, used for metadataBase, sitemap, robots, and
// structured data. Set NEXT_PUBLIC_SITE_URL (no trailing slash) once the client
// buys their domain; until then the placeholder below keeps builds working.
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

export const site = {
  name: "Client Business Name",
  phone: "000-000-0000",
  phoneHref: "tel:0000000000",
  email: "hello@example.com",
  emailHref: "mailto:hello@example.com",
  location: "City, Region & surrounding areas",
} as const;

export const routes = {
  home: "/",
  about: "/about",
  services: "/services",
  contact: "/contact",
} as const;
