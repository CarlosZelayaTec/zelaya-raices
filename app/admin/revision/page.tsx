import { getPropertyTypeInitials } from "@/modules/properties/property-types";
import styles from "@/shared/components/dashboard-content.module.css";
import { requireStaffContext } from "@/shared/lib/auth";
import { formatHNL } from "@/shared/lib/formatters";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { moderateListingAction } from "./actions";
import reviewStyles from "./review.module.css";

const stateMessages: Record<string, string> = {
  publish: "La propiedad fue verificada y publicada.",
  request_changes: "El anuncio volvió a borrador con tus observaciones.",
  reject: "El anuncio fue rechazado y la decisión quedó registrada.",
  "motivo-requerido": "Escribe un motivo claro antes de devolver o rechazar.",
  "multimedia-incompleta": "El anuncio no tiene multimedia suficiente.",
  "error-multimedia": "No fue posible preparar los archivos públicos.",
  conflicto:
    "El anuncio cambió mientras lo revisabas. Actualiza la página y vuelve a comprobarlo.",
  "solicitud-invalida": "La solicitud de moderación no es válida.",
};

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  await requireStaffContext(undefined, "/admin/revision");
  const { estado } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: listings } = await supabase
    .from("listings")
    .select(
      "id,title,description,property_type,operation_type,price_amount,price_on_request,currency_code,bedrooms,bathrooms,land_area,land_area_unit,version,created_at,organization_id,organizations(name),listing_locations(department,municipality,city,zone,visible_address),listing_media(id,media_type,source_path,is_primary,sort_order)",
    )
    .eq("publication_status", "pending_review")
    .order("updated_at", { ascending: true });

  return (
    <>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Moderación editorial</p>
          <h1>Revisión de anuncios</h1>
          <p>
            Comprueba que la información sea clara, coherente y respaldada por
            multimedia antes de publicar.
          </p>
        </div>
      </header>

      {estado && stateMessages[estado] ? (
        <div
          className={styles.notice}
          data-tone={
            ["publish", "request_changes", "reject"].includes(estado)
              ? "success"
              : "danger"
          }
          role="status"
        >
          <span aria-hidden="true">i</span>
          <div>
            <strong>Resultado de la revisión</strong>
            {stateMessages[estado]}
          </div>
        </div>
      ) : null}

      {listings && listings.length > 0 ? (
        <div className={reviewStyles.queue}>
          {listings.map((listing) => {
            const location = Array.isArray(listing.listing_locations)
              ? listing.listing_locations[0]
              : listing.listing_locations;
            const organization = Array.isArray(listing.organizations)
              ? listing.organizations[0]
              : listing.organizations;
            const images = listing.listing_media.filter(
              (media) => media.media_type === "image",
            );

            return (
              <article className={reviewStyles.reviewCard} key={listing.id}>
                <div className={reviewStyles.summary}>
                  <div className={reviewStyles.propertyMark}>
                    <span>
                      {getPropertyTypeInitials(listing.property_type)}
                    </span>
                    <small>{images.length} fotos</small>
                  </div>
                  <div className={reviewStyles.details}>
                    <div className={reviewStyles.heading}>
                      <div>
                        <span className={styles.badge} data-tone="warning">
                          Pendiente
                        </span>
                        <h2>{listing.title}</h2>
                        <p>
                          {organization?.name ?? "Cuenta sin nombre"} ·{" "}
                          {location
                            ? [
                                location.zone,
                                location.city,
                                location.municipality,
                                location.department,
                              ]
                                .filter(Boolean)
                                .join(", ")
                            : "Ubicación no disponible"}
                        </p>
                      </div>
                      <strong className={reviewStyles.price}>
                        {listing.price_on_request
                          ? "Precio a consultar"
                          : listing.currency_code === "HNL" &&
                              listing.price_amount !== null
                            ? formatHNL(Number(listing.price_amount))
                            : `${listing.currency_code} ${Number(
                                listing.price_amount ?? 0,
                              ).toLocaleString("es-HN")}`}
                      </strong>
                    </div>
                    <p className={reviewStyles.description}>
                      {listing.description}
                    </p>
                    <dl className={reviewStyles.facts}>
                      <div>
                        <dt>Operación</dt>
                        <dd>
                          {listing.operation_type === "sale"
                            ? "Venta"
                            : "Alquiler"}
                        </dd>
                      </div>
                      <div>
                        <dt>Habitaciones</dt>
                        <dd>{listing.bedrooms ?? "No aplica"}</dd>
                      </div>
                      <div>
                        <dt>Baños</dt>
                        <dd>{listing.bathrooms ?? "No aplica"}</dd>
                      </div>
                      <div>
                        <dt>Área de terreno</dt>
                        <dd>
                          {listing.land_area
                            ? `${listing.land_area} ${listing.land_area_unit}`
                            : "No indicada"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className={reviewStyles.actions}>
                  <form action={moderateListingAction}>
                    <input
                      name="listing_id"
                      type="hidden"
                      value={listing.id}
                    />
                    <input
                      name="version"
                      type="hidden"
                      value={listing.version}
                    />
                    <input name="action" type="hidden" value="publish" />
                    <button
                      className="button button--primary button--small"
                      disabled={images.length === 0}
                      type="submit"
                    >
                      Verificar y publicar
                    </button>
                  </form>

                  <form
                    action={moderateListingAction}
                    className={reviewStyles.feedbackForm}
                  >
                    <input
                      name="listing_id"
                      type="hidden"
                      value={listing.id}
                    />
                    <input
                      name="version"
                      type="hidden"
                      value={listing.version}
                    />
                    <label>
                      <span>Observación para el anunciante</span>
                      <textarea
                        maxLength={2000}
                        minLength={5}
                        name="public_reason"
                        placeholder="Explica qué debe corregirse o por qué se rechaza..."
                        required
                        rows={2}
                      />
                    </label>
                    <label>
                      <span>Nota interna (opcional)</span>
                      <input
                        maxLength={5000}
                        name="internal_notes"
                        placeholder="Solo visible para administración"
                      />
                    </label>
                    <div>
                      <button
                        className={styles.inlineButton}
                        name="action"
                        type="submit"
                        value="request_changes"
                      >
                        Solicitar correcciones
                      </button>
                      <button
                        className={`${styles.inlineButton} ${styles.inlineButtonDanger}`}
                        name="action"
                        type="submit"
                        value="reject"
                      >
                        Rechazar
                      </button>
                    </div>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className={`${styles.panelCard} ${styles.emptyState}`}>
          <div>
            <span className={styles.emptyStateMark}>✓</span>
            <h2>La cola está al día</h2>
            <p>No hay propiedades pendientes de revisión en este momento.</p>
          </div>
        </section>
      )}
    </>
  );
}
