import type { Database } from "@/shared/lib/supabase/database.types";

type OrganizationRow =
  Database["public"]["Tables"]["organizations"]["Row"];

export type ListingWizardOrganization = Pick<
  OrganizationRow,
  "id" | "name" | "organization_type" | "verification_status"
>;

export type ListingPublicationWizardProps = {
  organizations: readonly ListingWizardOrganization[];
  initialOrganizationId?: string;
  className?: string;
  onDraftSaved?: (listingId: string) => void;
  onSubmitted?: (listingId: string) => void;
};
