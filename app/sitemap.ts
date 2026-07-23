import type { MetadataRoute } from "next";
import { properties } from "../modules/properties/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const propertyPages = properties.map((property) => ({
    url: `https://zelayaraices.com/propiedades/${property.slug}`,
    lastModified: new Date("2026-07-22"),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: "https://zelayaraices.com",
      lastModified: new Date("2026-07-22"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://zelayaraices.com/propiedades",
      lastModified: new Date("2026-07-22"),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...propertyPages,
  ];
}
