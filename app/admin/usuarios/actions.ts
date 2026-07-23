"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaffContext } from "@/shared/lib/auth";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import type { Database } from "@/shared/lib/supabase/database.types";

type StaffRole = Database["public"]["Enums"]["staff_role"];

export async function setStaffRoleAction(formData: FormData) {
  await requireStaffContext(["super_admin"], "/admin/usuarios");

  const profileId = formData.get("profile_id");
  const rawRole = formData.get("staff_role");
  const role =
    typeof rawRole === "string" && rawRole
      ? (rawRole as StaffRole)
      : null;

  if (
    typeof profileId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(profileId) ||
    (role && !["super_admin", "admin", "moderator"].includes(role))
  ) {
    redirect("/admin/usuarios?estado=solicitud-invalida");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_platform_staff_role", {
    p_profile_id: profileId,
    p_staff_role: role as StaffRole,
  });

  if (error) {
    redirect("/admin/usuarios?estado=no-actualizado");
  }

  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios?estado=rol-actualizado");
}
