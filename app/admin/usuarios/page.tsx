import styles from "@/shared/components/dashboard-content.module.css";
import { requireStaffContext } from "@/shared/lib/auth";
import { staffRoleLabels } from "@/shared/lib/dashboard/labels";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { setStaffRoleAction } from "./actions";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const context = await requireStaffContext(undefined, "/admin/usuarios");
  const { estado } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id,display_name,slug,staff_role,account_status,verification_status,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(250);
  const canAssignRoles = context.profile?.staff_role === "super_admin";

  return (
    <>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Acceso y responsabilidades</p>
          <h1>Usuarios y roles</h1>
          <p>
            Los roles administrativos son independientes de los roles de
            agencia. Solo un superadministrador puede cambiarlos.
          </p>
        </div>
      </header>

      {estado ? (
        <div className={styles.notice} role="status">
          <span aria-hidden="true">i</span>
          <div>
            <strong>
              {estado === "rol-actualizado"
                ? "Rol actualizado"
                : "No se pudo actualizar"}
            </strong>
            {estado === "rol-actualizado"
              ? "Los nuevos permisos ya están activos."
              : "La operación fue rechazada para proteger el acceso administrativo."}
          </div>
        </div>
      ) : null}

      <section className={styles.panelCard}>
        <div className={styles.panelHeading}>
          <h2>Cuentas registradas</h2>
          <span className={styles.badge} data-tone="info">
            {profiles?.length ?? 0} usuarios
          </span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Cuenta</th>
                <th>Verificación</th>
                <th>Rol de plataforma</th>
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((profile) => (
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
                    <span
                      className={styles.badge}
                      data-tone={
                        profile.account_status === "active"
                          ? "success"
                          : "danger"
                      }
                    >
                      {profile.account_status === "active"
                        ? "Activa"
                        : profile.account_status === "suspended"
                          ? "Suspendida"
                          : "Deshabilitada"}
                    </span>
                  </td>
                  <td>
                    {profile.verification_status === "verified"
                      ? "Verificado"
                      : profile.verification_status === "pending"
                        ? "Pendiente"
                        : "Sin verificar"}
                  </td>
                  <td>
                    {canAssignRoles ? (
                      <form
                        action={setStaffRoleAction}
                        className={styles.inlineActions}
                      >
                        <input
                          name="profile_id"
                          type="hidden"
                          value={profile.id}
                        />
                        <select
                          aria-label={`Rol de ${profile.display_name}`}
                          className={styles.select}
                          defaultValue={profile.staff_role ?? ""}
                          name="staff_role"
                        >
                          <option value="">Sin acceso administrativo</option>
                          <option value="moderator">Moderador</option>
                          <option value="admin">Administrador</option>
                          <option value="super_admin">
                            Superadministrador
                          </option>
                        </select>
                        <button className={styles.inlineButton} type="submit">
                          Guardar
                        </button>
                      </form>
                    ) : profile.staff_role ? (
                      staffRoleLabels[profile.staff_role]
                    ) : (
                      "Sin acceso administrativo"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

