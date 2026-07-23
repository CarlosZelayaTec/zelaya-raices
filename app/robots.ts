import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/agente", "/login"],
    },
    sitemap: "https://zelayaraices.com/sitemap.xml",
  };
}
