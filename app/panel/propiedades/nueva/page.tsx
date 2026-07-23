import { redirect } from "next/navigation";

import { ListingPublicationWizard } from "@/features/listings";
import styles from "@/shared/components/dashboard-content.module.css";
import { getPanelContext } from "@/shared/lib/dashboard/panel-context";

export default async function NewPropertyPage() {
  const context = await getPanelContext("/panel/propiedades/nueva");

  if (context.organizations.length === 0) {
    redirect("/panel/onboarding");
  }

  const organizations = context.organizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    organization_type: organization.organization_type,
    verification_status: organization.verification_status,
  }));

  return (
    <>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Nuevo anuncio</p>
          <h1>Publicar una propiedad debe sentirse fácil.</h1>
          <p>
            Completa cada sección a tu ritmo. Guardaremos un borrador antes de
            enviar la información a Zelaya Raíces.
          </p>
        </div>
      </header>
      <ListingPublicationWizard
        initialOrganizationId={organizations[0]?.id}
        organizations={organizations}
      />
    </>
  );
}

