import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardShell } from "@/shared/components/dashboard-shell";
import { signOutAction } from "@/shared/lib/auth/actions";
import { requireStaffContext } from "@/shared/lib/auth";
import { staffRoleLabels } from "@/shared/lib/dashboard/labels";

export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await requireStaffContext();
  const staffRole = context.profile?.staff_role;

  if (!staffRole) return null;

  return (
    <DashboardShell
      eyebrow="Administración"
      name={
        context.profile?.display_name ??
        context.identity.email ??
        "Administrador"
      }
      navigation={[
        { href: "/admin", label: "Resumen", shortLabel: "IN" },
        {
          href: "/admin/revision",
          label: "Revisión de anuncios",
          shortLabel: "RV",
        },
        { href: "/admin/usuarios", label: "Usuarios y roles", shortLabel: "US" },
        { href: "/panel", label: "Panel de usuario", shortLabel: "PA" },
      ]}
      organizationName="Zelaya Raíces"
      roleLabel={staffRoleLabels[staffRole]}
      signOutAction={signOutAction}
    >
      {children}
    </DashboardShell>
  );
}

