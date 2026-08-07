import Link from "next/link";

import styles from "@/shared/components/dashboard-content.module.css";
import { requireStaffContext } from "@/shared/lib/auth";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

export default async function AdminPage() {
  const context = await requireStaffContext();
  const canManageVerifications =
    context.profile?.staff_role === "super_admin";
  const supabase = await createSupabaseServerClient();
  const [
    usersResult,
    organizationsResult,
    listingsResult,
    pendingResult,
    reportsResult,
    profileVerificationsResult,
    organizationVerificationsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("organizations").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("publication_status", "pending_review"),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_review"]),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("account_status", "active")
      .in("verification_status", ["unverified", "pending"]),
    supabase
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .in("verification_status", ["unverified", "pending"]),
  ]);

  return (
    <>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Control de la plataforma</p>
          <h1>Buenos días. Esto requiere tu atención.</h1>
          <p>
            Supervisa el crecimiento, prioriza revisiones y conserva la calidad
            de cada anuncio publicado.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link
            className="button button--primary button--small"
            href="/admin/revision"
          >
            Abrir cola de revisión
          </Link>
          {canManageVerifications ? (
            <Link
              className="button button--outline button--small"
              href="/admin/verificaciones"
            >
              Verificar anunciantes
            </Link>
          ) : null}
        </div>
      </header>

      <section className={styles.statsGrid} aria-label="Resumen administrativo">
        <article className={`${styles.statCard} ${styles.statCardAccent}`}>
          <span>Pendientes de revisión</span>
          <strong>{pendingResult.count ?? 0}</strong>
          <small>Anuncios esperando una decisión</small>
        </article>
        <article className={styles.statCard}>
          <span>Propiedades</span>
          <strong>{listingsResult.count ?? 0}</strong>
          <small>En todos los estados</small>
        </article>
        <article className={styles.statCard}>
          <span>Usuarios</span>
          <strong>{usersResult.count ?? 0}</strong>
          <small>{organizationsResult.count ?? 0} organizaciones</small>
        </article>
        <article className={styles.statCard}>
          <span>Reportes abiertos</span>
          <strong>{reportsResult.count ?? 0}</strong>
          <small>Incidencias por investigar</small>
        </article>
      </section>

      <section className={styles.contentGrid}>
        <article className={`${styles.panelCard} ${styles.panelPadding}`}>
          <h2>Prioridades operativas</h2>
          <div className={styles.quickActions}>
            <Link className={styles.quickAction} href="/admin/revision">
              <span>01</span>
              <span>
                <strong>Revisar nuevos anuncios</strong>
                <small>
                  {pendingResult.count ?? 0} pendientes en este momento
                </small>
              </span>
              <span>→</span>
            </Link>
            <Link className={styles.quickAction} href="/admin/usuarios">
              <span>02</span>
              <span>
                <strong>Administrar usuarios y roles</strong>
                <small>Control de acceso reservado a la plataforma</small>
              </span>
              <span>→</span>
            </Link>
            {canManageVerifications ? (
              <Link
                className={styles.quickAction}
                href="/admin/verificaciones"
              >
                <span>03</span>
                <span>
                  <strong>Validar anunciantes</strong>
                  <small>
                    {(profileVerificationsResult.count ?? 0) +
                      (organizationVerificationsResult.count ?? 0)}{" "}
                    cuentas pendientes de verificación
                  </small>
                </span>
                <span>→</span>
              </Link>
            ) : null}
          </div>
        </article>

        <aside className={`${styles.panelCard} ${styles.panelPadding}`}>
          <h2>Confianza de la plataforma</h2>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>Publicación automática</span>
              <strong>Desactivada</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Seguridad de datos</span>
              <strong>RLS activo</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Historial</span>
              <strong>Auditoría activa</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Mercado</span>
              <strong>Honduras</strong>
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}
