import Link from "next/link";

import { getPropertyTypeLabel } from "@/modules/properties/property-types";
import styles from "@/shared/components/dashboard-content.module.css";
import {
  availabilityStatusLabels,
  publicationStatusLabels,
  publicationTone,
} from "@/shared/lib/dashboard/labels";
import { getPanelContext } from "@/shared/lib/dashboard/panel-context";
import { formatHNL } from "@/shared/lib/formatters";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { updateAvailabilityAction } from "./actions";

function hasRequiredPublicContact(profile: Awaited<ReturnType<typeof getPanelContext>>["profile"]) {
  if (!profile) return false;

  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.public_email ?? "") &&
    /^\+[1-9]\d{7,14}$/.test(profile.public_phone ?? "") &&
    /^\+[1-9]\d{7,14}$/.test(profile.public_whatsapp ?? "")
  );
}

export default async function PanelPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const context = await getPanelContext("/panel/propiedades");
  const { estado } = await searchParams;
  const organizationIds = context.organizations.map(
    (organization) => organization.id,
  );
  const needsPublicContact = !hasRequiredPublicContact(context.profile);
  const supabase = await createSupabaseServerClient();
  const { data: listings } =
    organizationIds.length > 0
      ? await supabase
          .from("listings")
          .select(
            "id,title,publication_status,availability_status,price_amount,price_on_request,currency_code,operation_type,property_type,view_count,updated_at",
          )
          .in("organization_id", organizationIds)
          .order("updated_at", { ascending: false })
      : { data: [] };

  return (
    <>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Inventario inmobiliario</p>
          <h1>Mis propiedades</h1>
          <p>
            Continúa borradores, revisa el estado de validación y mantén
            actualizada la disponibilidad de cada inmueble.
          </p>
        </div>
        {organizationIds.length > 0 ? (
          <div className={styles.headerActions}>
            <Link
              className="button button--primary button--small"
              href="/panel/propiedades/nueva"
            >
              + Nueva propiedad
            </Link>
          </div>
        ) : null}
      </header>

      {needsPublicContact ? (
        <div className={styles.notice} role="status">
          <span aria-hidden="true">i</span>
          <div>
            <strong>Completa tus datos de contacto</strong>
            Antes de enviar un anuncio a revisión, agrega un correo, teléfono y
            WhatsApp válidos para que las personas interesadas puedan contactarte.
            {" "}
            <Link href="/panel/cuenta">Completar mi perfil</Link>
          </div>
        </div>
      ) : null}

      {estado ? (
        <div className={styles.notice} role="status">
          <span aria-hidden="true">i</span>
          <div>
            <strong>
              {estado === "disponibilidad-actualizada"
                ? "Disponibilidad actualizada"
                : estado === "edicion-no-disponible"
                  ? "Edición no disponible"
                  : estado === "edicion-incompleta"
                    ? "Falta información para editar"
                    : "No se pudo actualizar"}
            </strong>
            {estado === "disponibilidad-actualizada"
                ? "El nuevo estado ya está guardado."
              : estado === "edicion-no-disponible"
                ? "Los anuncios que ya están en revisión no pueden modificarse hasta que el equipo termine de evaluarlos."
                : estado === "edicion-incompleta"
                  ? "Este anuncio no tiene una ubicación completa todavía. Actualízala desde un borrador nuevo o solicita ayuda al equipo."
                  : "La propiedad puede estar en revisión o fuera de tu alcance."}
          </div>
        </div>
      ) : null}

      {organizationIds.length === 0 ? (
        <section className={`${styles.panelCard} ${styles.emptyState}`}>
          <div>
            <span className={styles.emptyStateMark}>01</span>
            <h2>Primero configura tu cuenta</h2>
            <p>
              Elige si publicarás como propietario, agencia o empresa. Solo
              tomará un minuto.
            </p>
            <Link
              className="button button--primary"
              href="/panel/onboarding"
            >
              Configurar mi cuenta
            </Link>
          </div>
        </section>
      ) : listings && listings.length > 0 ? (
        <section className={styles.panelCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Propiedad</th>
                  <th>Publicación</th>
                  <th>Disponibilidad</th>
                  <th>Precio</th>
                  <th>Actividad</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing.id}>
                    <td>
                      <strong>{listing.title}</strong>
                      <small>
                        {getPropertyTypeLabel(listing.property_type)}
                        {" · "}
                        {listing.operation_type === "sale"
                          ? "Venta"
                          : "Alquiler"}
                      </small>
                    </td>
                    <td>
                      <span
                        className={styles.badge}
                        data-tone={publicationTone(
                          listing.publication_status,
                        )}
                      >
                        {publicationStatusLabels[listing.publication_status]}
                      </span>
                    </td>
                    <td>
                      {listing.publication_status !== "pending_review" &&
                      listing.publication_status !== "archived" ? (
                        <form
                          action={updateAvailabilityAction}
                          className={styles.inlineActions}
                        >
                          <input
                            name="listing_id"
                            type="hidden"
                            value={listing.id}
                          />
                          <select
                            aria-label={`Disponibilidad de ${listing.title}`}
                            className={styles.select}
                            defaultValue={listing.availability_status}
                            name="availability_status"
                          >
                            {Object.entries(availabilityStatusLabels).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                          <button
                            className={styles.inlineButton}
                            type="submit"
                          >
                            Guardar
                          </button>
                        </form>
                      ) : (
                        availabilityStatusLabels[
                          listing.availability_status
                        ]
                      )}
                    </td>
                    <td>
                      <strong>
                        {listing.price_on_request
                          ? "Consultar"
                          : listing.currency_code === "HNL" &&
                              listing.price_amount !== null
                            ? formatHNL(Number(listing.price_amount))
                            : `${listing.currency_code} ${Number(
                                listing.price_amount ?? 0,
                              ).toLocaleString("es-HN")}`}
                      </strong>
                    </td>
                    <td>
                      <strong>
                        {Number(listing.view_count).toLocaleString("es-HN")}{" "}
                        vistas
                      </strong>
                      <small>
                        {new Intl.DateTimeFormat("es-HN", {
                          dateStyle: "medium",
                        }).format(new Date(listing.updated_at))}
                      </small>
                    </td>
                    <td>
                      <div className={styles.inlineActions}>
                        {["draft", "rejected"].includes(
                          listing.publication_status,
                        ) ? (
                          <Link
                            className={styles.inlineButton}
                            href={`/panel/propiedades/${listing.id}/editar`}
                          >
                            Editar
                          </Link>
                        ) : listing.publication_status === "pending_review" ? (
                          <span className={styles.inlineButton}>
                            En revisión
                          </span>
                        ) : listing.publication_status === "published" ? (
                          <Link
                            className={styles.inlineButton}
                            href={`/panel/propiedades/${listing.id}/editar`}
                          >
                            Editar y reenviar a revisión
                          </Link>
                        ) : (
                          <span className={styles.inlineButton}>
                            Edición no disponible
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className={`${styles.panelCard} ${styles.emptyState}`}>
          <div>
            <span className={styles.emptyStateMark}>+</span>
            <h2>Tu inventario está listo para comenzar</h2>
            <p>
              Crea un terreno, casa o apartamento. Podrás guardarlo como
              borrador antes de enviarlo a revisión.
            </p>
            <Link
              className="button button--primary"
              href="/panel/propiedades/nueva"
            >
              Crear primera propiedad
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
