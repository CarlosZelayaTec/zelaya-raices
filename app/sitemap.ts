import type { MetadataRoute } from "next";
import { getPublicProperties } from "../modules/properties/public-data.server";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const properties = await getPublicProperties();
  const propertyPages = properties
    .filter((property) => property.source === "supabase")
    .map((property) => ({
      url: `https://zelayaraices.com/propiedades/${property.slug}`,
      lastModified: property.updatedAt
        ? new Date(property.updatedAt)
        : new Date("2026-07-22"),
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
