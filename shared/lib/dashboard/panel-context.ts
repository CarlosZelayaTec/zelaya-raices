import "server-only";

import { requireAuthContext } from "@/shared/lib/auth";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import type { Tables } from "@/shared/lib/supabase/database.types";

export type PanelOrganization = Pick<
  Tables<"organizations">,
  "id" | "name" | "organization_type" | "verification_status" | "status"
> & {
  membership: Tables<"organization_members">;
};

export async function getPanelContext(returnTo = "/panel") {
  const auth = await requireAuthContext(returnTo);
  const organizationIds = auth.memberships.map(
    (membership) => membership.organization_id,
  );

  if (organizationIds.length === 0) {
    return { ...auth, organizations: [] as PanelOrganization[] };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id,name,organization_type,verification_status,status")
    .in("id", organizationIds)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("No fue posible cargar las organizaciones del panel.");
  }

  const memberships = new Map(
    auth.memberships.map((membership) => [
      membership.organization_id,
      membership,
    ]),
  );

  const organizations = (data ?? []).flatMap((organization) => {
    const membership = memberships.get(organization.id);
    return membership ? [{ ...organization, membership }] : [];
  });

  return { ...auth, organizations };
}

