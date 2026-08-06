import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "@/shared/components/brand";
import { getAuthIdentity } from "@/shared/lib/auth/context";
import { safeAfterSignInPath } from "@/shared/lib/auth/redirects";
import { AuthForms, type AuthMode } from "./auth-forms";
import styles from "./login.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ingresar",
  description: "Accede de forma segura a tu cuenta de Zelaya Raíces.",
  robots: { follow: false, index: false },
};

type LoginPageProps = {
  searchParams: Promise<{
    estado?: string | string[];
    modo?: string | string[];
    next?: string | string[];
  }>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function authMode(value: string | undefined): AuthMode {
  if (value === "registro") return "register";
  if (value === "recuperar") return "recover";
  return "login";
}

function noticeFor(value: string | undefined): string | undefined {
  if (value === "enlace-invalido") {
    return "El enlace no es válido o ya venció. Solicita uno nuevo.";
  }
  if (value === "sesion-cerrada") {
    return "Tu sesión se cerró correctamente.";
  }
  if (value === "error-sesion") {
    return "No pudimos cerrar la sesión completamente. Inténtalo de nuevo.";
  }
  if (value === "cuenta-no-disponible") {
    return "Esta cuenta no está disponible. Contacta a soporte si necesitas ayuda.";
  }
  return undefined;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const state = firstValue(params.estado);
  const nextPath = safeAfterSignInPath(firstValue(params.next), "/panel");
  const identity = await getAuthIdentity();

  // An unavailable account is sent here by the panel guard; redirecting it
  // immediately would create a loop between /login and /panel.
  if (
    identity &&
    !identity.isAnonymous &&
    state !== "cuenta-no-disponible"
  ) {
    redirect(nextPath);
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.intro} aria-labelledby="login-intro-title">
          <Link className={styles.homeLink} href="/">
            ← Volver al sitio
          </Link>
          <div>
            <p className={styles.introEyebrow}>Zelaya Raíces</p>
            <h2 id="login-intro-title">
              Publica y administra con un proceso que protege tu reputación.
            </h2>
            <p>
              Cada anuncio conserva su historial, responsables y revisión antes
              de publicarse.
            </p>
          </div>
          <ul className={styles.trustList}>
            <li>
              <span aria-hidden="true">01</span>
              Sesiones seguras y permisos por organización
            </li>
            <li>
              <span aria-hidden="true">02</span>
              Propiedades revisadas antes de publicarse
            </li>
            <li>
              <span aria-hidden="true">03</span>
              Cambios importantes con trazabilidad
            </li>
          </ul>
        </section>

        <section className={styles.card} aria-label="Acceso a la plataforma">
          <div className={styles.brandWrap}>
            <Brand />
          </div>
          <AuthForms
            initialMode={authMode(firstValue(params.modo))}
            nextPath={nextPath}
            notice={noticeFor(state)}
          />
          <p className={styles.support}>
            ¿Necesitas ayuda?{" "}
            <a href="mailto:hola@zelayaraices.com">hola@zelayaraices.com</a>
          </p>
        </section>
      </div>
    </main>
  );
}
