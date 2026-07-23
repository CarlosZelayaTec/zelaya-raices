import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardShell } from "@/shared/components/dashboard-shell";
import { signOutAction } from "@/shared/lib/auth/actions";
import { getPanelContext } from "@/shared/lib/dashboard/panel-context";
import {
  organizationRoleLabels,
  staffRoleLabels,
} from "@/shared/lib/dashboard/labels";

export const metadata: Metadata = {
  title: "Mi panel",
  robots: { index: false, follow: false },
};

export default async function PanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await getPanelContext();
  const activeOrganization = context.organizations[0];
  const staffRole = context.profile?.staff_role;
  const name =
    context.profile?.display_name ??
    context.identity.email ??
    "Cuenta Zelaya Raíces";

  const navigation = [
    { href: "/panel", label: "Resumen", shortLabel: "IN" },
    {
      href: "/panel/propiedades",
      label: "Mis propiedades",
      shortLabel: "PR",
    },
    { href: "/panel/cuenta", label: "Mi perfil", shortLabel: "PE" },
    ...(staffRole
      ? [{ href: "/admin", label: "Administración", shortLabel: "AD" }]
      : []),
  ];

  const roleLabel = staffRole
    ? staffRoleLabels[staffRole]
    : activeOrganization
      ? organizationRoleLabels[activeOrganization.membership.role]
      : "Comprador o arrendatario";

  return (
    <DashboardShell
      eyebrow="Panel de usuario"
      name={name}
      navigation={navigation}
      organizationName={activeOrganization?.name}
      roleLabel={roleLabel}
      signOutAction={signOutAction}
    >
      {children}
    </DashboardShell>
  );
}

