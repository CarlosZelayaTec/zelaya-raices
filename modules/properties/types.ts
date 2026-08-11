import type { Database } from "@/shared/lib/supabase/database.types";

export type PropertyStatus =
  | "draft"
  | "submitted"
  | "changes_requested"
  | "approved"
  | "published"
  | "rejected"
  | "archived";

export type PropertyCurrency = "HNL" | "USD";

export type PropertyAreaUnit =
  | "m2"
  | "vara2"
  | "manzana"
  | "sqft"
  | "acre";

export type PropertyAvailability =
  | "available"
  | "reserved"
  | "sold"
  | "rented"
  | "unavailable";

export type PropertyMedia = {
  id: string;
  type: "image" | "video";
  url: string;
  altText?: string;
  isPrimary: boolean;
  sortOrder: number;
};

export type PropertySeller = {
  name: string;
  bio?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  verified: boolean;
};

export type PropertyMapLocation = {
  latitude: number;
  longitude: number;
  precision: "zone" | "approximate" | "exact";
  confirmed: boolean;
};

export type Property = {
  slug: string;
  title: string;
  city: string;
  department: string;
  address: string;
  operation: "Venta" | "Alquiler";
  propertyType: string;
  propertyTypeValue?: Database["public"]["Enums"]["property_type"];
  price: number | null;
  priceOnRequest?: boolean;
  currencyCode?: PropertyCurrency;
  pricePeriod?: "monthly" | "nightly";
  bedrooms: number | null;
  bathrooms: number | null;
  area: number;
  areaUnit?: PropertyAreaUnit;
  parking: number | null;
  image: string;
  gallery: string[];
  media?: PropertyMedia[];
  featured: boolean;
  status: PropertyStatus;
  availabilityStatus?: PropertyAvailability;
  verified: boolean;
  agentVerified: boolean;
  advertiserName?: string;
  advertiserVerified?: boolean;
  seller?: PropertySeller;
  locationConfirmed: boolean;
  locationPrecision?: "zone" | "approximate" | "exact";
  mapLocation?: PropertyMapLocation;
  priceUpdatedAt: string;
  reviewedAt: string;
  publishedChanges: number | null;
  reportCount: number;
  description: string;
  publishedAt?: string;
  updatedAt?: string;
  source?: "demo" | "supabase";
};
