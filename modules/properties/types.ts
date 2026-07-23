export type PropertyStatus =
  | "draft"
  | "submitted"
  | "changes_requested"
  | "approved"
  | "published"
  | "rejected"
  | "archived";

export type Property = {
  slug: string;
  title: string;
  city: string;
  department: string;
  address: string;
  operation: "Venta" | "Alquiler";
  propertyType: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  parking: number;
  image: string;
  gallery: string[];
  featured: boolean;
  status: PropertyStatus;
  verified: boolean;
  agentVerified: boolean;
  locationConfirmed: boolean;
  priceUpdatedAt: string;
  reviewedAt: string;
  publishedChanges: number;
  reportCount: number;
  description: string;
};
