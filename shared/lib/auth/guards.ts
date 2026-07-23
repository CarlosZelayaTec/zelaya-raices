import { redirect } from "next/navigation";

import {
  getAuthContext,
  getAuthIdentity,
  type AuthContext,
  type AuthIdentity,
  type OrganizationMembership,
} from "./context";
import { buildLoginPath } from "./redirects";
import type { Database } from "@/shared/lib/supabase/database.types";

export type StaffRole = Database["public"]["Enums"]["staff_role"];
export type OrganizationRole =
  Database["public"]["Enums"]["organization_member_role"];

const DEFAULT_STAFF_ROLES: readonly StaffRole[] = [
  "super_admin",
  "admin",
  "moderator",
];

export async function requireAuthIdentity(
  returnTo = "/panel",
): Promise<AuthIdentity> {
  const identity = await getAuthIdentity();

  if (!identity || identity.isAnonymous) {
    redirect(buildLoginPath(returnTo));
  }

  return identity;
}

export async function requireAuthContext(
  returnTo = "/panel",
): Promise<AuthContext> {
  const context = await getAuthContext();

  if (!context || context.identity.isAnonymous) {
    redirect(buildLoginPath(returnTo));
  }

  if (!context.profile || context.profile.account_status !== "active") {
    redirect("/login?estado=cuenta-no-disponible");
  }

  return context;
}

export async function requireStaffContext(
  allowedRoles: readonly StaffRole[] = DEFAULT_STAFF_ROLES,
  returnTo = "/admin",
): Promise<AuthContext> {
  const context = await requireAuthContext(returnTo);
  const staffRole = context.profile?.staff_role;

  if (!staffRole || !allowedRoles.includes(staffRole)) {
    redirect("/panel?estado=sin-permiso");
  }

  return context;
}

type OrganizationGuardOptions = {
  allowedRoles?: readonly OrganizationRole[];
  returnTo?: string;
};

export async function requireOrganizationMembership(
  organizationId: string,
  options: OrganizationGuardOptions = {},
): Promise<{
  context: AuthContext;
  membership: OrganizationMembership;
}> {
  const context = await requireAuthContext(options.returnTo ?? "/panel");
  const membership = context.memberships.find(
    (item) => item.organization_id === organizationId,
  );

  if (
    !membership ||
    (options.allowedRoles &&
      !options.allowedRoles.includes(membership.role))
  ) {
    redirect("/panel?estado=sin-permiso");
  }

  return { context, membership };
}
