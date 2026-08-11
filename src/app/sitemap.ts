import type { MetadataRoute } from "next";
import { siteUrl, routes } from "@/lib/constants";

// BUILD AGENT: keep this in sync with the routes you actually build — one entry
// per real page. Drop entries for routes in `constants.ts` you didn't create.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    {
      url: `${siteUrl}${routes.services}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}${routes.about}`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}${routes.contact}`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.8,
    },
  ];
}
