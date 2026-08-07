import Link from "next/link";

import styles from "@/shared/components/dashboard-content.module.css";
import { requireStaffContext } from "@/shared/lib/auth";
import type { Database } from "@/shared/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { moderateVerificationAction } from "./actions";

type VerificationStatus =
  Database["public"]["Enums"]["verification_status"];
type AdvertiserRole = "agency_owner" | "agent" | "property_owner";

const pendingStatuses = ["unverified", "pending"] as const;
const advertiserRoles = [
  "agency_owner",
  "agent",
  "property_owner",
] as const;

const verificationLabels: Record<VerificationStatus, string> = {
  unverified: "Sin verificar",
  pending: "Pendiente",
  verified: "Verificado",
  rejected: "Rechazado",
};

const verificationTones: Record<
  VerificationStatus,
  "warning" | "success" | "danger"
> = {
  unverified: "warning",
  pending: "warning",
  verified: "success",
  rejected: "danger",
};

const advertiserRoleLabels: Record<AdvertiserRole, string> = {
  agency_owner: "Dueño de agencia",
  agent: "Agente",
  property_owner: "Propietario anunciante",
};

const organizationTypeLabels: Record<
  Database["public"]["Enums"]["organization_type"],
  string
> = {
  agency: "Agencia",
  individual_owner: "Propietario",
  business: "Cuenta empresarial",
};

const stateMessages: Record<string, { title: string; copy: string }> = {
  verificado: {
    title: "Verificación aprobada",
    copy: "La cuenta ya puede mostrarse como verificada en la plataforma.",
  },
  rechazado: {
    title: "Verificación rechazada",
    copy: "La cuenta queda sin verificar y no se mostrará como validada.",
  },
  "solicitud-invalida": {
    title: "Solicitud no válida",
    copy: "Actualiza la página e intenta nuevamente.",
  },
  "no-actualizado": {
    title: "No fue posible actualizar",
    copy: "La cuenta pudo haber cambiado. Actualiza la página y vuelve a intentarlo.",
  },
};

function contactSummary(
  phone: string | null,
  whatsapp: string | null,
  email?: string | null,
) {
  const methods = [
    phone ? "Teléfono" : null,
    whatsapp ? "WhatsApp" : null,
    email ? "Correo" : null,
  ].filter(Boolean);

  return methods.length > 0 ? methods.join(" · ") : "Sin datos públicos";
}

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  await requireStaffContext(["super_admin"], "/admin/verificaciones");
  const { estado } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const [profilesResult, membershipsResult, organizationsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id,display_name,slug,public_email,public_phone,public_whatsapp,verification_status,created_at",
        )
        .eq("account_status", "active")
        .in("verification_status", pendingStatuses)
        .order("created_at", { ascending: true })
        .limit(250),
      supabase
        .from("organization_members")
        .select("profile_id,role")
        .eq("status", "active")
        .in("role", advertiserRoles)
        .limit(1000),
      supabase
        .from("organizations")
        .select(
          "id,name,slug,organization_type,public_email,public_phone,status,verification_status,created_at",
        )
        .eq("status", "active")
        .in("verification_status", pendingStatuses)
        .order("created_at", { ascending: true })
        .limit(250),
    ]);

  const rolesByProfile = new Map<string, AdvertiserRole[]>();

  for (const membership of membershipsResult.data ?? []) {
    const role = membership.role as AdvertiserRole;
    const currentRoles = rolesByProfile.get(membership.profile_id) ?? [];

    if (!currentRoles.includes(role)) {
      rolesByProfile.set(membership.profile_id, [...currentRoles, role]);
    }
  }

  const advertisers = (profilesResult.data ?? []).filter((profile) =>
    rolesByProfile.has(profile.id),
  );
  const organizations = organizationsResult.data ?? [];
  const profilePending = advertisers.filter(
    (profile) => profile.verification_status === "pending",
  ).length;
  const organizationPending = organizations.filter(
    (organization) => organization.verification_status === "pending",
  ).length;
  const loadError =
    profilesResult.error || membershipsResult.error || organizationsResult.error;
  const stateMessage = estado ? stateMessages[estado] : undefined;

  return (
    <>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Control de confianza</p>
          <h1>Verificaciones de anunciantes</h1>
          <p>
            Valida a quienes publican antes de destacar su identidad ante las
            personas que buscan una propiedad.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link
            className="button button--outline button--small"
            href="/admin/usuarios"
          >
            Ver usuarios y roles
          </Link>
        </div>
      </header>

      {stateMessage ? (
        <div className={styles.notice} role="status">
          <span aria-hidden="true">i</span>
          <div>
            <strong>{stateMessage.title}</strong>
            {stateMessage.copy}
          </div>
        </div>
      ) : null}

      {loadError ? (
        <div className={styles.notice} role="alert">
          <span aria-hidden="true">!</span>
          <div>
            <strong>No pudimos cargar toda la cola</strong>
            Actualiza la página. Si el problema continúa, revisa los permisos
            administrativos de Supabase.
          </div>
        </div>
      ) : null}

      <section
        className={styles.statsGrid}
        aria-label="Resumen de verificaciones"
      >
        <article className={`${styles.statCard} ${styles.statCardAccent}`}>
          <span>Anunciantes por revisar</span>
          <strong>{advertisers.length}</strong>
          <small>{profilePending} solicitudes enviadas</small>
        </article>
        <article className={styles.statCard}>
          <span>Perfiles sin verificar</span>
          <strong>{advertisers.length - profilePending}</strong>
          <small>Agentes o propietarios activos</small>
        </article>
        <article className={styles.statCard}>
          <span>Organizaciones por revisar</span>
          <strong>{organizations.length}</strong>
          <small>{organizationPending} solicitudes enviadas</small>
        </article>
        <article className={styles.statCard}>
          <span>Organizaciones sin verificar</span>
          <strong>{organizations.length - organizationPending}</strong>
          <small>Agencias, propietarios y empresas</small>
        </article>
      </section>

      <section className={styles.panelCard}>
        <div className={styles.panelHeading}>
          <h2>Agentes y propietarios anunciantes</h2>
          <span className={styles.badge} data-tone="warning">
            {advertisers.length} pendientes
          </span>
        </div>

        {advertisers.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Anunciante</th>
                  <th>Rol</th>
                  <th>Contacto público</th>
                  <th>Estado</th>
                  <th>Decisión</th>
                </tr>
              </thead>
              <tbody>
                {advertisers.map((profile) => {
                  const roles = rolesByProfile.get(profile.id) ?? [];

                  return (
                    <tr key={profile.id}>
                      <td>
                        <strong>{profile.display_name}</strong>
                        <small>
                          {profile.slug
                            ? `@${profile.slug}`
                            : profile.id.slice(0, 8)}
                        </small>
                      </td>
                      <td>
                        {roles
                          .map((role) => advertiserRoleLabels[role])
                          .join(" · ")}
                      </td>
                      <td>
                        {contactSummary(
                          profile.public_phone,
                          profile.public_whatsapp,
                          profile.public_email,
                        )}
                      </td>
                      <td>
                        <span
                          className={styles.badge}
                          data-tone={
                            verificationTones[profile.verification_status]
                          }
                        >
                          {verificationLabels[profile.verification_status]}
                        </span>
                      </td>
                      <td>
                        <form
                          action={moderateVerificationAction}
                          className={styles.inlineActions}
                        >
                          <input
                            name="target_id"
                            type="hidden"
                            value={profile.id}
                          />
                          <input
                            name="target_type"
                            type="hidden"
                            value="profile"
                          />
                          <button
                            className={styles.inlineButton}
                            name="action"
                            type="submit"
                            value="verify"
                          >
                            Verificar
                          </button>
                          <button
                            className={`${styles.inlineButton} ${styles.inlineButtonDanger}`}
                            name="action"
                            type="submit"
                            value="reject"
                          >
                            Rechazar
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div>
              <span className={styles.emptyStateMark}>✓</span>
              <h3>No hay anunciantes pendientes</h3>
              <p>Los próximos agentes o propietarios aparecerán aquí.</p>
            </div>
          </div>
        )}
      </section>

      <section className={styles.panelCard} style={{ marginTop: 20 }}>
        <div className={styles.panelHeading}>
          <h2>Agencias, propietarios y cuentas empresariales</h2>
          <span className={styles.badge} data-tone="warning">
            {organizations.length} pendientes
          </span>
        </div>

        {organizations.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Organización</th>
                  <th>Tipo</th>
                  <th>Contacto público</th>
                  <th>Estado</th>
                  <th>Decisión</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((organization) => (
                  <tr key={organization.id}>
                    <td>
                      <strong>{organization.name}</strong>
                      <small>@{organization.slug}</small>
                    </td>
                    <td>
                      {organizationTypeLabels[organization.organization_type]}
                    </td>
                    <td>
                      {contactSummary(
                        organization.public_phone,
                        null,
                        organization.public_email,
                      )}
                    </td>
                    <td>
                      <span
                        className={styles.badge}
                        data-tone={
                          verificationTones[organization.verification_status]
                        }
                      >
                        {
                          verificationLabels[
                            organization.verification_status
                          ]
                        }
                      </span>
                    </td>
                    <td>
                      <form
                        action={moderateVerificationAction}
                        className={styles.inlineActions}
                      >
                        <input
                          name="target_id"
                          type="hidden"
                          value={organization.id}
                        />
                        <input
                          name="target_type"
                          type="hidden"
                          value="organization"
                        />
                        <button
                          className={styles.inlineButton}
                          name="action"
                          type="submit"
                          value="verify"
                        >
                          Verificar
                        </button>
                        <button
                          className={`${styles.inlineButton} ${styles.inlineButtonDanger}`}
                          name="action"
                          type="submit"
                          value="reject"
                        >
                          Rechazar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div>
              <span className={styles.emptyStateMark}>✓</span>
              <h3>No hay organizaciones pendientes</h3>
              <p>Las nuevas agencias y cuentas empresariales aparecerán aquí.</p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
