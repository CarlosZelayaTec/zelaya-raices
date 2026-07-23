import { redirect } from "next/navigation";

import styles from "@/shared/components/dashboard-content.module.css";
import { getPanelContext } from "@/shared/lib/dashboard/panel-context";

import { OnboardingForm } from "./onboarding-form";
import onboardingStyles from "./onboarding.module.css";

export default async function OnboardingPage() {
  const context = await getPanelContext("/panel/onboarding");

  if (context.organizations.length > 0) {
    redirect("/panel");
  }

  return (
    <div className={onboardingStyles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Configuración inicial</p>
          <h1>Prepara tu espacio para publicar.</h1>
          <p>
            Solo necesitamos saber cómo trabajas. Después podrás crear tu
            primera propiedad con una guía paso a paso.
          </p>
        </div>
      </header>
      <section className={onboardingStyles.card}>
        <div className={onboardingStyles.progress}>
          <span>1</span>
          <div>
            <strong>Tu cuenta de publicación</strong>
            <small>Un único paso · menos de un minuto</small>
          </div>
        </div>
        <OnboardingForm />
      </section>
    </div>
  );
}

