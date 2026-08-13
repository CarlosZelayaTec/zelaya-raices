import type { Database } from "@/shared/lib/supabase/database.types";

type OrganizationRow =
  Database["public"]["Tables"]["organizations"]["Row"];

export type ListingWizardOrganization = Pick<
  OrganizationRow,
  "id" | "name" | "organization_type" | "verification_status"
>;

type AreaUnit = Database["public"]["Enums"]["area_unit"];
type CurrencyCode = Database["public"]["Enums"]["currency_code"];
type LocationPrecision =
  Database["public"]["Enums"]["location_precision"];
type PricePeriod = Database["public"]["Enums"]["price_period"];
type PropertyType = Database["public"]["Enums"]["property_type"];
type OperationType = Database["public"]["Enums"]["operation_type"];
type AvailabilityStatus =
  Database["public"]["Enums"]["availability_status"];

/**
 * A serializable media record used to prefill the publication wizard. The
 * preview URL is generated on the server with the authenticated session, so
 * private draft media never needs to be exposed through a public URL.
 */
export type ListingWizardInitialMedia = {
  id: string;
  kind: "image" | "video" | "document";
  previewUrl: string;
  fileName: string;
  sizeBytes: number;
  sourceBucket: string;
  sourcePath: string;
  isPrimary: boolean;
};

/**
 * The complete, server-authorized state required to continue a draft or a
 * rejected listing, or to prepare an approved listing for another review.
 */
export type ListingWizardInitialListing = {
  id: string;
  slug: string;
  version: number;
  publicationStatus: "draft" | "rejected" | "published";
  organizationId: string;
  availabilityStatus: AvailabilityStatus;
  propertyType: PropertyType;
  operationType: OperationType;
  title: string;
  description: string;
  priceAmount: number | null;
  priceOnRequest: boolean;
  currencyCode: CurrencyCode;
  pricePeriod: PricePeriod;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  landArea: number | null;
  landAreaUnit: AreaUnit | null;
  constructionArea: number | null;
  constructionAreaUnit: AreaUnit | null;
  yearBuilt: number | null;
  location: {
    department: string;
    municipality: string;
    city: string | null;
    zone: string | null;
    privateAddress: string | null;
    exactLatitude: number;
    exactLongitude: number;
    precision: LocationPrecision;
  };
  media: readonly ListingWizardInitialMedia[];
};

export type ListingWizardSellerContact = {
  displayName: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  isComplete: boolean;
};

export type ListingPublicationWizardProps = {
  organizations: readonly ListingWizardOrganization[];
  sellerContact: ListingWizardSellerContact;
  initialOrganizationId?: string;
  initialListing?: ListingWizardInitialListing;
  className?: string;
  onDraftSaved?: (listingId: string) => void;
  onSubmitted?: (listingId: string) => void;
};
