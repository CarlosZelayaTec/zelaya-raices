import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  ListingPublicationWizard,
  type ListingWizardInitialListing,
} from "@/features/listings";
import styles from "@/shared/components/dashboard-content.module.css";
import { getPanelContext } from "@/shared/lib/dashboard/panel-context";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

type EditPropertyPageProps = {
  params: Promise<{ listingId: string }>;
};

export const dynamic = "force-dynamic";

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function mediaFileName(sourcePath: string, position: number) {
  const filename = sourcePath.split("/").at(-1);

  if (!filename || filename.startsWith("original.")) {
    return `Archivo ${position + 1}`;
  }

  return filename;
}

export default async function EditPropertyPage({
  params,
}: EditPropertyPageProps) {
  const { listingId } = await params;

  if (!validUuid(listingId)) notFound();

  const context = await getPanelContext(`/panel/propiedades/${listingId}/editar`);
  const supabase = await createSupabaseServerClient();
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select(
      "id,slug,version,publication_status,organization_id,availability_status,property_type,operation_type,title,description,price_amount,price_on_request,currency_code,price_period,bedrooms,bathrooms,parking_spaces,land_area,land_area_unit,construction_area,construction_area_unit,year_built",
    )
    .eq("id", listingId)
    .maybeSingle();

  if (listingError) {
    throw new Error("No fue posible cargar la propiedad para editar.");
  }

  if (!listing) notFound();

  const isMemberOfOrganization = context.organizations.some(
    (organization) => organization.id === listing.organization_id,
  );

  if (!isMemberOfOrganization) notFound();

  if (listing.publication_status === "pending_review") {
    redirect("/panel/propiedades?estado=edicion-no-disponible");
  }

  if (listing.publication_status === "archived") notFound();

  const [publicLocationResult, privateLocationResult, mediaResult] =
    await Promise.all([
      supabase
        .from("listing_locations")
        .select(
          "department,municipality,city,zone,precision,public_latitude,public_longitude",
        )
        .eq("listing_id", listing.id)
        .maybeSingle(),
      supabase
        .from("listing_private_locations")
        .select("private_address,exact_latitude,exact_longitude")
        .eq("listing_id", listing.id)
        .maybeSingle(),
      supabase
        .from("listing_media")
        .select(
          "id,media_type,mime_type,size_bytes,source_bucket,source_path,public_bucket,public_path,is_primary,sort_order",
        )
        .eq("listing_id", listing.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  if (
    publicLocationResult.error ||
    privateLocationResult.error ||
    mediaResult.error
  ) {
    throw new Error("No fue posible cargar toda la información del anuncio.");
  }

  const publicLocation = publicLocationResult.data;
  const privateLocation = privateLocationResult.data;

  if (!publicLocation) {
    redirect("/panel/propiedades?estado=edicion-incompleta");
  }

  const media = await Promise.all(
    (mediaResult.data ?? []).map(async (item, index) => {
      let previewUrl = "";

      if (item.public_bucket && item.public_path) {
        previewUrl = supabase.storage
          .from(item.public_bucket)
          .getPublicUrl(item.public_path).data.publicUrl;
      } else {
        const { data } = await supabase.storage
          .from(item.source_bucket)
          .createSignedUrl(item.source_path, 60 * 60);
        previewUrl = data?.signedUrl ?? "";
      }

      return {
        id: item.id,
        kind:
          item.mime_type.startsWith("image/")
            ? ("image" as const)
            : item.media_type === "video"
              ? ("video" as const)
              : ("document" as const),
        previewUrl,
        fileName: mediaFileName(item.source_path, index),
        sizeBytes: item.size_bytes,
        sourceBucket: item.source_bucket,
        sourcePath: item.source_path,
        isPrimary: item.is_primary,
      };
    }),
  );

  const initialListing: ListingWizardInitialListing = {
    id: listing.id,
    slug: listing.slug,
    version: listing.version,
    publicationStatus: listing.publication_status,
    organizationId: listing.organization_id,
    availabilityStatus: listing.availability_status,
    propertyType: listing.property_type,
    operationType: listing.operation_type,
    title: listing.title,
    description: listing.description,
    priceAmount: listing.price_amount,
    priceOnRequest: listing.price_on_request,
    currencyCode: listing.currency_code,
    pricePeriod: listing.price_period,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    parkingSpaces: listing.parking_spaces,
    landArea: listing.land_area,
    landAreaUnit: listing.land_area_unit,
    constructionArea: listing.construction_area,
    constructionAreaUnit: listing.construction_area_unit,
    yearBuilt: listing.year_built,
    location: {
      department: publicLocation.department,
      municipality: publicLocation.municipality,
      city: publicLocation.city,
      zone: publicLocation.zone,
      privateAddress: privateLocation?.private_address ?? null,
      exactLatitude:
        privateLocation?.exact_latitude ?? publicLocation.public_latitude,
      exactLongitude:
        privateLocation?.exact_longitude ?? publicLocation.public_longitude,
      precision: publicLocation.precision,
    },
    media,
  };

  const organizations = context.organizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    organization_type: organization.organization_type,
    verification_status: organization.verification_status,
  }));
  const sellerContact = {
    displayName:
      context.profile?.display_name ?? context.identity.email ?? "Mi perfil",
    email: context.profile?.public_email ?? null,
    phone: context.profile?.public_phone ?? null,
    whatsapp: context.profile?.public_whatsapp ?? null,
    isComplete: Boolean(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        context.profile?.public_email ?? "",
      ) &&
        /^\+[1-9]\d{7,14}$/.test(context.profile?.public_phone ?? "") &&
        /^\+[1-9]\d{7,14}$/.test(context.profile?.public_whatsapp ?? ""),
    ),
  };

  return (
    <>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Editar anuncio</p>
          <h1>Actualiza tu propiedad con tranquilidad.</h1>
          <p>
            {listing.publication_status === "published"
              ? "Podrás actualizar los datos principales y reenviarlos a revisión. La ubicación privada y la galería se conservarán sin cambios."
              : "Conservamos la ubicación privada y el orden de tu galería. Cuando termines, puedes guardar los cambios o enviarlos a nueva revisión."}
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link
            className="button button--outline button--small"
            href="/panel/propiedades"
          >
            Volver a mis propiedades
          </Link>
        </div>
      </header>
      <ListingPublicationWizard
        initialListing={initialListing}
        initialOrganizationId={listing.organization_id}
        organizations={organizations}
        sellerContact={sellerContact}
      />
    </>
  );
}
