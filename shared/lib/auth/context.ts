import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import type { Tables } from "@/shared/lib/supabase/database.types";

export type AuthIdentity = {
  email: string | null;
  id: string;
  isAnonymous: boolean;
  sessionId: string;
};

export type Profile = Tables<"profiles">;
export type OrganizationMembership = Tables<"organization_members">;

export type AuthContext = {
  identity: AuthIdentity;
  memberships: OrganizationMembership[];
  profile: Profile | null;
};

export class AuthContextLoadError extends Error {
  constructor() {
    super("No fue posible cargar el contexto de autorización.");
    this.name = "AuthContextLoadError";
  }
}

async function createVerifiedRequestContext() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) return null;

  const { claims } = data;
  if (
    typeof claims.sub !== "string" ||
    !claims.sub ||
    typeof claims.session_id !== "string" ||
    !claims.session_id
  ) {
    return null;
  }

  const identity: AuthIdentity = {
    email: typeof claims.email === "string" ? claims.email : null,
    id: claims.sub,
    isAnonymous: claims.is_anonymous === true,
    sessionId: claims.session_id,
  };

  return { identity, supabase };
}

export async function getAuthIdentity(): Promise<AuthIdentity | null> {
  const verified = await createVerifiedRequestContext();
  return verified?.identity ?? null;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const verified = await createVerifiedRequestContext();
  if (!verified) return null;

  const { identity, supabase } = verified;
  const [profileResult, membershipsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", identity.id).maybeSingle(),
    supabase
      .from("organization_members")
      .select("*")
      .eq("profile_id", identity.id)
      .eq("status", "active")
      .order("created_at", { ascending: true }),
  ]);

  if (profileResult.error || membershipsResult.error) {
    throw new AuthContextLoadError();
  }

  return {
    identity,
    memberships: membershipsResult.data ?? [],
    profile: profileResult.data,
  };
}
