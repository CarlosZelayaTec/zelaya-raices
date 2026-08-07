"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaffContext } from "@/shared/lib/auth";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

export async function moderateVerificationAction(formData: FormData) {
  await requireStaffContext(["super_admin"], "/admin/verificaciones");

  const targetId = formData.get("target_id");
  const targetType = formData.get("target_type");
  const action = formData.get("action");

  if (
    typeof targetId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(targetId) ||
    (targetType !== "profile" && targetType !== "organization") ||
    (action !== "verify" && action !== "reject")
  ) {
    redirect("/admin/verificaciones?estado=solicitud-invalida");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("moderate_verification", {
    p_action: action,
    p_target_id: targetId,
    p_target_type: targetType,
  });

  if (error) {
    redirect("/admin/verificaciones?estado=no-actualizado");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/verificaciones");
  revalidatePath("/admin/usuarios");
  revalidatePath("/panel");
  revalidatePath("/panel/propiedades");
  revalidatePath("/");
  revalidatePath("/propiedades");
  revalidatePath("/propiedades/[slug]", "page");
  revalidatePath("/sitemap.xml");

  redirect(
    `/admin/verificaciones?estado=${
      action === "verify" ? "verificado" : "rechazado"
    }`,
  );
}
