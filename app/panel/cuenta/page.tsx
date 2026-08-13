import styles from "@/shared/components/dashboard-content.module.css";
import { getPanelContext } from "@/shared/lib/dashboard/panel-context";

import { updateProfileAction } from "./actions";
import accountStyles from "./profile.module.css";

const profileErrorMessages: Record<string, string> = {
  "contacto-requerido": "Completa un correo, teléfono y WhatsApp válidos para mantener tu anuncio publicado.",
  "correo-invalido": "Ingresa un correo de contacto válido.",
  "descripcion-invalida": "La presentación profesional supera el límite permitido.",
  error: "No pudimos guardar los cambios. Inténtalo nuevamente.",
  "nombre-invalido": "El nombre público debe tener entre 2 y 120 caracteres.",
  "telefono-invalido": "Ingresa un teléfono válido, por ejemplo +504 9876-5432.",
  "whatsapp-invalido": "Ingresa un número de WhatsApp válido, por ejemplo +504 9876-5432.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const context = await getPanelContext("/panel/cuenta");
  const { estado } = await searchParams;

  return (
    <>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Identidad y contacto</p>
          <h1>Mi perfil</h1>
          <p>
            Mantén tus datos claros. La información pública solo se mostrará
            cuando corresponda y ayudará a generar confianza.
          </p>
        </div>
      </header>

      <section className={`${styles.panelCard} ${accountStyles.card}`}>
        <div className={accountStyles.heading}>
          <div className={accountStyles.avatar} aria-hidden="true">
            {context.profile?.display_name
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase() || "ZR"}
          </div>
          <div>
            <h2>Información principal</h2>
            <p>{context.identity.email}</p>
          </div>
        </div>

        {estado === "guardado" ? (
          <p className={accountStyles.success} role="status">
            Perfil actualizado correctamente.
          </p>
        ) : estado && profileErrorMessages[estado] ? (
          <p className={accountStyles.error} role="alert">
            {profileErrorMessages[estado]}
          </p>
        ) : null}

        <form action={updateProfileAction} className={accountStyles.form}>
          <label>
            <span>Nombre público</span>
            <input
              defaultValue={context.profile?.display_name ?? ""}
              maxLength={120}
              minLength={2}
              name="display_name"
              required
            />
          </label>
          <div className={accountStyles.twoColumns}>
            <label>
              <span>Correo de contacto</span>
              <input
                defaultValue={context.profile?.public_email ?? ""}
                inputMode="email"
                name="public_email"
                placeholder="tu@correo.com"
                type="email"
              />
            </label>
            <label>
              <span>Teléfono de respaldo</span>
              <input
                defaultValue={context.profile?.public_phone ?? ""}
                inputMode="tel"
                name="public_phone"
                placeholder="+504 0000-0000"
              />
            </label>
            <label>
              <span>WhatsApp</span>
              <input
                defaultValue={context.profile?.public_whatsapp ?? ""}
                inputMode="tel"
                name="public_whatsapp"
                placeholder="+504 0000-0000"
              />
            </label>
          </div>
          <p className={accountStyles.contactHint}>
            El correo y WhatsApp se mostrarán en tus propiedades. El teléfono de
            respaldo se valida para tu cuenta, pero permanece privado. Los tres
            datos se reutilizan automáticamente al enviar cada anuncio.
          </p>
          <label>
            <span>Presentación profesional</span>
            <textarea
              defaultValue={context.profile?.bio ?? ""}
              maxLength={2000}
              name="bio"
              placeholder="Cuéntales a tus clientes sobre tu experiencia y zonas de trabajo."
              rows={5}
            />
          </label>
          <button
            className="button button--primary button--small"
            type="submit"
          >
            Guardar cambios
          </button>
        </form>
      </section>
    </>
  );
}
