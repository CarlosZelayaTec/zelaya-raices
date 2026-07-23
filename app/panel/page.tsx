import Link from "next/link";

import styles from "@/shared/components/dashboard-content.module.css";
import { getPanelContext } from "@/shared/lib/dashboard/panel-context";
import {
  publicationStatusLabels,
  publicationTone,
} from "@/shared/lib/dashboard/labels";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

type DashboardSummary = {
  inquiries: { open: number; total: number };
  listings: {
    available: number;
    drafts: number;
    pending_review: number;
    published: number;
    total: number;
    views: number;
  };
  recent_listings: Array<{
    availability_status: string;
    id: string;
    publication_status:
      | "draft"
      | "pending_review"
      | "published"
      | "rejected"
      | "archived";
    title: string;
    updated_at: string;
    view_count: number;
  }>;
};

const emptySummary: DashboardSummary = {
  inquiries: { open: 0, total: 0 },
  listings: {
    available: 0,
    drafts: 0,
    pending_review: 0,
    published: 0,
    total: 0,
    views: 0,
  },
  recent_listings: [],
};

export default async function PanelPage() {
  const context = await getPanelContext();
  const organization = context.organizations[0];
  let summary = emptySummary;

  if (organization) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.rpc("get_agent_dashboard", {
      p_organization_id: organization.id,
    });

    if (data && typeof data === "object") {
      summary = data as unknown as DashboardSummary;
    }
  }

  if (!organization) {
    return (
      <>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Bienvenido a Zelaya Raíces</p>
            <h1>Tu espacio para encontrar o publicar con confianza.</h1>
            <p>
              Puedes explorar propiedades como cliente o crear tu perfil de
              propietario, agencia o empresa cuando estés listo para publicar.
            </p>
          </div>
        </header>

        <section className={`${styles.panelCard} ${styles.emptyState}`}>
          <div>
            <span className={styles.emptyStateMark}>ZR</span>
            <h2>¿Quieres publicar una propiedad?</h2>
            <p>
              Configura una cuenta de publicación en menos de un minuto. Tus
              anuncios siempre quedarán como borrador antes de enviarlos a
              revisión.
            </p>
            <div className={styles.headerActions}>
              <Link
                className="button button--primary"
                href="/panel/onboarding"
              >
                Configurar mi cuenta
              </Link>
              <Link className="button button--outline" href="/propiedades">
                Explorar propiedades
              </Link>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Actividad de hoy</p>
          <h1>Todo bajo control.</h1>
          <p>
            Revisa tus anuncios, consultas y próximas acciones desde un solo
            lugar.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link
            className="button button--primary button--small"
            href="/panel/propiedades/nueva"
          >
            + Nueva propiedad
          </Link>
        </div>
      </header>

      <section className={styles.statsGrid} aria-label="Resumen de actividad">
        <article className={`${styles.statCard} ${styles.statCardAccent}`}>
          <span>Propiedades</span>
          <strong>{summary.listings.total}</strong>
          <small>{summary.listings.published} publicadas</small>
        </article>
        <article className={styles.statCard}>
          <span>En revisión</span>
          <strong>{summary.listings.pending_review}</strong>
          <small>Esperando respuesta de Zelaya Raíces</small>
        </article>
        <article className={styles.statCard}>
          <span>Consultas abiertas</span>
          <strong>{summary.inquiries.open}</strong>
          <small>{summary.inquiries.total} consultas totales</small>
        </article>
        <article className={styles.statCard}>
          <span>Visualizaciones</span>
          <strong>{summary.listings.views.toLocaleString("es-HN")}</strong>
          <small>Acumuladas en tus anuncios</small>
        </article>
      </section>

      <section className={styles.contentGrid}>
        <article className={styles.panelCard}>
          <div className={styles.panelHeading}>
            <h2>Propiedades recientes</h2>
            <Link href="/panel/propiedades">Ver todas</Link>
          </div>
          {summary.recent_listings.length > 0 ? (
            <ul className={styles.list}>
              {summary.recent_listings.map((listing) => (
                <li className={styles.listItem} key={listing.id}>
                  <div>
                    <h3>{listing.title}</h3>
                    <p>
                      Actualizada{" "}
                      {new Intl.DateTimeFormat("es-HN", {
                        dateStyle: "medium",
                      }).format(new Date(listing.updated_at))}
                    </p>
                  </div>
                  <div className={styles.listItemAside}>
                    <span
                      className={styles.badge}
                      data-tone={publicationTone(
                        listing.publication_status,
                      )}
                    >
                      {publicationStatusLabels[listing.publication_status]}
                    </span>
                    <strong>
                      {listing.view_count.toLocaleString("es-HN")} vistas
                    </strong>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.emptyState}>
              <div>
                <span className={styles.emptyStateMark}>+</span>
                <h3>Aún no hay propiedades</h3>
                <p>
                  El asistente te acompañará paso a paso para preparar tu
                  primer anuncio.
                </p>
                <Link
                  className="button button--primary button--small"
                  href="/panel/propiedades/nueva"
                >
                  Crear mi primer anuncio
                </Link>
              </div>
            </div>
          )}
        </article>

        <aside className={`${styles.panelCard} ${styles.panelPadding}`}>
          <h2>Acciones rápidas</h2>
          <div className={styles.quickActions}>
            <Link
              className={styles.quickAction}
              href="/panel/propiedades/nueva"
            >
              <span>01</span>
              <span>
                <strong>Publicar propiedad</strong>
                <small>Guía sencilla de cuatro pasos</small>
              </span>
              <span>→</span>
            </Link>
            <Link className={styles.quickAction} href="/panel/propiedades">
              <span>02</span>
              <span>
                <strong>Continuar borradores</strong>
                <small>{summary.listings.drafts} por completar</small>
              </span>
              <span>→</span>
            </Link>
            <Link className={styles.quickAction} href="/panel/cuenta">
              <span>03</span>
              <span>
                <strong>Completar perfil</strong>
                <small>Mejora la confianza de tus clientes</small>
              </span>
              <span>→</span>
            </Link>
          </div>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>Moneda principal</span>
              <strong>Lempiras (HNL)</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Cuenta</span>
              <strong>
                {organization.verification_status === "verified"
                  ? "Verificada"
                  : "Pendiente de verificar"}
              </strong>
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}
