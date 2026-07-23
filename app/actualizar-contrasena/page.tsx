import type { Metadata } from "next";
import Link from "next/link";

import { PasswordForm } from "./password-form";
import styles from "./password.module.css";
import { Brand } from "@/shared/components/brand";
import { getAuthIdentity } from "@/shared/lib/auth/context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Actualizar contraseña",
  description: "Define una nueva contraseña para tu cuenta.",
  robots: { follow: false, index: false },
};

export default async function UpdatePasswordPage() {
  const identity = await getAuthIdentity();

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.brandWrap}>
          <Brand />
        </div>
        <p className={styles.eyebrow}>Seguridad de la cuenta</p>
        <h1>Define una nueva contraseña</h1>
        <p className={styles.lead}>
          La nueva contraseña reemplazará la anterior y mantendremos esta sesión
          activa para que puedas continuar.
        </p>

        {identity && !identity.isAnonymous ? (
          <PasswordForm />
        ) : (
          <div className={styles.expired}>
            <p>
              El enlace no es válido o ya venció. Solicita uno nuevo para
              continuar.
            </p>
            <Link href="/login?modo=recuperar">
              Solicitar un enlace nuevo
            </Link>
          </div>
        )}

        <Link className={styles.back} href="/login">
          Volver al inicio de sesión
        </Link>
      </section>
    </main>
  );
}
