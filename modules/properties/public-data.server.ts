import { cache } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getPublicSupabaseConfig } from "@/shared/lib/supabase/config";
import type { Database } from "@/shared/lib/supabase/database.types";

import { getPropertyBySlug, properties as demoProperties } from "./data";
import type { Property, PropertyMedia } from "./types";

const demoCatalogEnabled = process.env.ENABLE_DEMO_LISTINGS === "true";

type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
type LocationRow = Database["public"]["Tables"]["listing_locations"]["Row"];
type MediaRow = Database["public"]["Tables"]["listing_media"]["Row"];
type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];

type PublicLocation = Pick<
  LocationRow,
  | "city"
  | "department"
  | "location_confirmed_at"
  | "municipality"
  | "precision"
  | "visible_address"
  | "zone"
>;

type PublicMedia = Pick<
  MediaRow,
  | "alt_text"
  | "id"
  | "is_primary"
  | "media_type"
  | "processing_status"
  | "public_bucket"
  | "public_path"
  | "sort_order"
>;

type PublicOrganization = Pick<
  OrganizationRow,
  "name" | "verification_status"
>;

type PublicListingRow = Pick<
  ListingRow,
  | "availability_status"
  | "bathrooms"
  | "bedrooms"
  | "construction_area"
  | "construction_area_unit"
  | "currency_code"
  | "description"
  | "featured_until"
  | "id"
  | "land_area"
  | "land_area_unit"
  | "last_price_update_at"
  | "operation_type"
  | "parking_spaces"
  | "price_amount"
  | "price_on_request"
  | "price_period"
  | "property_type"
  | "publication_status"
  | "published_at"
  | "reports_count"
  | "slug"
  | "title"
  | "updated_at"
  | "verification_status"
  | "verified_at"
> & {
  listing_locations: PublicLocation[] | PublicLocation | null;
  listing_media: PublicMedia[] | null;
  organizations: PublicOrganization[] | PublicOrganization | null;
};

const PUBLIC_LISTING_FIELDS = `
  id,
  title,
  slug,
  description,
  operation_type,
  property_type,
  publication_status,
  availability_status,
  price_amount,
  price_on_request,
  currency_code,
  price_period,
  bedrooms,
  bathrooms,
  parking_spaces,
  land_area,
  land_area_unit,
  construction_area,
  construction_area_unit,
  verification_status,
  featured_until,
  published_at,
  verified_at,
  last_price_update_at,
  reports_count,
  updated_at,
  organizations(name,verification_status),
  listing_locations(
    city,
    department,
    location_confirmed_at,
    municipality,
    precision,
    visible_address,
    zone
  ),
  listing_media(
    alt_text,
    id,
    is_primary,
    media_type,
    processing_status,
    public_bucket,
    public_path,
    sort_order
  )
`;

const propertyTypeLabels: Record<ListingRow["property_type"], string> = {
  apartment: "Apartamento",
  building: "Edificio",
  commercial: "Local comercial",
  condominium: "Condominio",
  farm: "Finca",
  house: "Casa",
  land: "Terreno",
  office: "Oficina",
  warehouse: "Bodega",
};

function createPublicCatalogClient() {
  const { publishableKey, url } = getPublicSupabaseConfig();

  return createClient<Database>(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function firstRelated<T>(value: T[] | T | null) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatPublicDate(value: string | null) {
  if (!value) return "No disponible";

  return new Intl.DateTimeFormat("es-HN", {
    day: "numeric",
    month: "short",
    timeZone: "America/Tegucigalpa",
    year: "numeric",
  }).format(new Date(value));
}

function getPublicMediaUrl(
  client: SupabaseClient<Database>,
  bucket: string,
  path: string,
) {
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function mapListing(
  client: SupabaseClient<Database>,
  listing: PublicListingRow,
): Property | null {
  const location = firstRelated(listing.listing_locations);
  const organization = firstRelated(listing.organizations);
  const media = (listing.listing_media ?? [])
    .filter(
      (item) =>
        item.processing_status === "ready" &&
        item.public_bucket === "listing-public" &&
        Boolean(item.public_path) &&
        (item.media_type === "image" || item.media_type === "video"),
    )
    .map<PropertyMedia>((item) => ({
      altText: item.alt_text || undefined,
      id: item.id,
      isPrimary: item.is_primary,
      sortOrder: item.sort_order,
      type: item.media_type as "image" | "video",
      url: getPublicMediaUrl(
        client,
        item.public_bucket as string,
        item.public_path as string,
      ),
    }))
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        Number(right.isPrimary) - Number(left.isPrimary) ||
        left.id.localeCompare(right.id),
    );

  const images = media.filter((item) => item.type === "image");
  const primaryImage = images.find((item) => item.isPrimary) ?? images[0];

  // Moderation requires a public primary image. Keeping this guard prevents a
  // partially processed row from creating a broken card if storage lags.
  if (!primaryImage) return null;

  const isLand = listing.property_type === "land";
  const area = isLand
    ? listing.land_area
    : (listing.construction_area ?? listing.land_area);
  const areaUnit = isLand
    ? listing.land_area_unit
    : (listing.construction_area_unit ?? listing.land_area_unit);
  const city = location?.city || location?.municipality || "Honduras";
  const department = location?.department || "Honduras";
  const address =
    location?.visible_address ||
    [location?.zone, city, department].filter(Boolean).join(", ");
  const advertiserVerified =
    organization?.verification_status === "verified";

  return {
    address,
    advertiserName: organization?.name || undefined,
    advertiserVerified,
    agentVerified: false,
    area: Number(area ?? 0),
    areaUnit: areaUnit ?? "m2",
    availabilityStatus: listing.availability_status,
    bathrooms: listing.bathrooms,
    bedrooms: listing.bedrooms,
    city,
    currencyCode: listing.currency_code,
    department,
    description: listing.description,
    featured:
      Boolean(listing.featured_until) &&
      new Date(listing.featured_until as string).getTime() > Date.now(),
    gallery: images.map((item) => item.url),
    image: primaryImage.url,
    locationConfirmed: Boolean(location?.location_confirmed_at),
    locationPrecision: location?.precision,
    media,
    operation: listing.operation_type === "sale" ? "Venta" : "Alquiler",
    parking: listing.parking_spaces,
    price: listing.price_amount,
    priceOnRequest: listing.price_on_request,
    pricePeriod:
      listing.price_period === "monthly" || listing.price_period === "nightly"
        ? listing.price_period
        : undefined,
    priceUpdatedAt: formatPublicDate(listing.last_price_update_at),
    propertyType: propertyTypeLabels[listing.property_type],
    publishedAt: listing.published_at ?? undefined,
    publishedChanges: null,
    reportCount: listing.reports_count,
    reviewedAt: formatPublicDate(listing.verified_at),
    slug: listing.slug,
    source: "supabase",
    status: "published",
    title: listing.title,
    updatedAt: listing.updated_at,
    verified: listing.verification_status === "verified",
  };
}

function mergeRealWithDemos(realProperties: Property[]) {
  const seen = new Set<string>();

  return [...realProperties, ...demoProperties].filter((property) => {
    if (seen.has(property.slug)) return false;
    seen.add(property.slug);
    return true;
  });
}

function reportCatalogError(error: unknown) {
  if (process.env.NODE_ENV === "test") return;

  const detail =
    typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : "unknown error";
  console.error(`[public-catalog] Supabase unavailable: ${detail}`);
}

async function fetchRealProperties() {
  const client = createPublicCatalogClient();
  const { data, error } = await client
    .from("listings")
    .select(PUBLIC_LISTING_FIELDS)
    .eq("publication_status", "published")
    .eq("verification_status", "verified")
    .eq("listing_media.processing_status", "ready")
    .eq("listing_media.public_bucket", "listing-public")
    .not("listing_media.public_path", "is", null)
    .order("published_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  return ((data ?? []) as unknown as PublicListingRow[])
    .map((listing) => mapListing(client, listing))
    .filter((property): property is Property => property !== null);
}

export const getPublicProperties = cache(async (): Promise<Property[]> => {
  try {
    const realProperties = await fetchRealProperties();
    return demoCatalogEnabled
      ? mergeRealWithDemos(realProperties)
      : realProperties;
  } catch (error) {
    reportCatalogError(error);
    return demoCatalogEnabled ? [...demoProperties] : [];
  }
});

export const getPublicPropertyBySlug = cache(
  async (slug: string): Promise<Property | undefined> => {
    const normalizedSlug = slug.trim().toLowerCase();
    const demoProperty = demoCatalogEnabled
      ? getPropertyBySlug(normalizedSlug)
      : undefined;

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
      return demoProperty;
    }

    try {
      const client = createPublicCatalogClient();
      const { data, error } = await client
        .from("listings")
        .select(PUBLIC_LISTING_FIELDS)
        .eq("slug", normalizedSlug)
        .eq("publication_status", "published")
        .eq("verification_status", "verified")
        .eq("listing_media.processing_status", "ready")
        .eq("listing_media.public_bucket", "listing-public")
        .not("listing_media.public_path", "is", null)
        .maybeSingle();

      if (error) throw error;
      if (!data) return demoProperty;

      return (
        mapListing(client, data as unknown as PublicListingRow) ?? demoProperty
      );
    } catch (error) {
      reportCatalogError(error);
      return demoProperty;
    }
  },
);
