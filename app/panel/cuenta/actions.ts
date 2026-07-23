"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthContext } from "@/shared/lib/auth";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

function value(formData: FormData, name: string) {
  const item = formData.get(name);
  return typeof item === "string" ? item.trim() : "";
}

export async function updateProfileAction(formData: FormData) {
  const context = await requireAuthContext("/panel/cuenta");
  const displayName = value(formData, "display_name");
  const publicPhone = value(formData, "public_phone");
  const publicWhatsapp = value(formData, "public_whatsapp");
  const bio = value(formData, "bio");

  if (displayName.length < 2 || displayName.length > 120) {
    redirect("/panel/cuenta?estado=nombre-invalido");
  }

  if (bio.length > 2000) {
    redirect("/panel/cuenta?estado=descripcion-invalida");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      bio: bio || null,
      display_name: displayName,
      public_phone: publicPhone || null,
      public_whatsapp: publicWhatsapp || null,
    })
    .eq("id", context.identity.id);

  if (error) {
    redirect("/panel/cuenta?estado=error");
  }

  revalidatePath("/panel", "layout");
  redirect("/panel/cuenta?estado=guardado");
}

