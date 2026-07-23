"use server";

import { redirect } from "next/navigation";

import { requireAuthContext } from "@/shared/lib/auth";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

export type ActivationState = { error: string | null };

export async function activateAdministrationAction(
  _state: ActivationState,
  formData: FormData,
): Promise<ActivationState> {
  const context = await requireAuthContext("/activar-administracion");

  if (context.profile?.staff_role) {
    redirect("/admin");
  }

  const rawCode = formData.get("activation_code");
  const code = typeof rawCode === "string" ? rawCode.trim() : "";

  if (code.length < 20 || code.length > 200) {
    return { error: "El código de activación no es válido." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("claim_initial_super_admin", {
    p_code: code,
  });

  if (error) {
    return {
      error:
        "El código es incorrecto, ya expiró o la administración ya fue activada.",
    };
  }

  redirect("/admin");
}

