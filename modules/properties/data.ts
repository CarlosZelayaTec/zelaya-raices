import type { Property } from "./types";

export const properties: Property[] = [
  {
    slug: "casa-contemporanea-lomas-del-guijarro",
    title: "Casa contemporánea en Lomas del Guijarro",
    city: "Tegucigalpa",
    department: "Francisco Morazán",
    address: "Lomas del Guijarro, Tegucigalpa",
    operation: "Venta",
    propertyType: "Casa",
    price: 8950000,
    bedrooms: 4,
    bathrooms: 3.5,
    area: 340,
    parking: 3,
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85",
    ],
    featured: true,
    status: "published",
    verified: true,
    agentVerified: true,
    locationConfirmed: true,
    priceUpdatedAt: "20 jul 2026",
    reviewedAt: "21 jul 2026",
    publishedChanges: 2,
    reportCount: 0,
    description:
      "Residencia de líneas limpias, espacios amplios y abundante luz natural. Cuenta con terraza social, jardín privado y una distribución pensada para la vida familiar en una de las zonas residenciales más buscadas de la capital.",
  },
  {
    slug: "apartamento-colonia-trejo",
    title: "Apartamento con vistas en Colonia Trejo",
    city: "San Pedro Sula",
    department: "Cortés",
    address: "Colonia Trejo, San Pedro Sula",
    operation: "Venta",
    propertyType: "Apartamento",
    price: 4350000,
    bedrooms: 3,
    bathrooms: 2,
    area: 128,
    parking: 2,
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=85",
    ],
    featured: true,
    status: "published",
    verified: true,
    agentVerified: true,
    locationConfirmed: true,
    priceUpdatedAt: "18 jul 2026",
    reviewedAt: "19 jul 2026",
    publishedChanges: 1,
    reportCount: 0,
    description:
      "Apartamento moderno con balcón, ventilación cruzada y áreas sociales integradas. El edificio ofrece acceso controlado y una ubicación conveniente cerca de comercios, restaurantes y servicios.",
  },
  {
    slug: "villa-caribena-west-bay",
    title: "Villa caribeña a pasos de West Bay",
    city: "Roatán",
    department: "Islas de la Bahía",
    address: "West Bay, Roatán",
    operation: "Venta",
    propertyType: "Villa",
    price: 16900000,
    bedrooms: 3,
    bathrooms: 3,
    area: 240,
    parking: 2,
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1400&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=85",
      "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1600566753051-f0b89df2dd90?auto=format&fit=crop&w=1200&q=85",
    ],
    featured: true,
    status: "published",
    verified: true,
    agentVerified: true,
    locationConfirmed: true,
    priceUpdatedAt: "16 jul 2026",
    reviewedAt: "17 jul 2026",
    publishedChanges: 3,
    reportCount: 0,
    description:
      "Villa rodeada de vegetación tropical con piscina, terrazas abiertas y acceso rápido a West Bay. Su diseño integra los espacios interiores con el paisaje caribeño y favorece la ventilación natural.",
  },
];

export const featuredProperties = properties.filter(
  (property) => property.featured && property.status === "published",
);

export function getPropertyBySlug(slug: string) {
  return properties.find((property) => property.slug === slug);
}
