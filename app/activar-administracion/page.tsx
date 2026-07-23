import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "@/shared/components/brand";
import { requireAuthContext } from "@/shared/lib/auth";

import { ActivationForm } from "./activation-form";
import styles from "./activation.module.css";

export const metadata: Metadata = {
  title: "Activar administración",
  robots: { index: false, follow: false },
};

export default async function ActivateAdministrationPage() {
  const context = await requireAuthContext("/activar-administracion");

  if (context.profile?.staff_role) {
    redirect("/admin");
  }

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <Brand />
        <Link href="/panel">Volver al panel</Link>
      </div>
      <section className={styles.card}>
        <span className={styles.mark}>ZR</span>
        <p className={styles.eyebrow}>Configuración reservada</p>
        <h1>Activa el control administrativo.</h1>
        <p className={styles.copy}>
          Este paso solo puede completarse una vez y requiere el código
          privado del propietario de Zelaya Raíces.
        </p>
        <ActivationForm />
        <p className={styles.safety}>
          La activación queda registrada en el historial de auditoría.
        </p>
      </section>
    </main>
  );
}

