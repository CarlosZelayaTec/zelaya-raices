"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthContext } from "@/shared/lib/auth";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

function value(formData: FormData, name: string) {
  const item = formData.get(name);
  return typeof item === "string" ? item.trim() : "";
}

function normalizePhone(value: string) {
  if (!value) return "";

  const digits = value.replace(/\D/g, "");

  // Store public numbers in E.164 so telephone and WhatsApp links work
  // consistently. Local Honduran numbers remain easy to enter.
  if (/^[2-9]\d{7}$/.test(digits)) return `+504${digits}`;
  if (/^504[2-9]\d{7}$/.test(digits)) return `+${digits}`;
  if (value.startsWith("+") && /^[1-9]\d{7,14}$/.test(digits)) {
    return `+${digits}`;
  }

  return "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function updateProfileAction(formData: FormData) {
  const context = await requireAuthContext("/panel/cuenta");
  const displayName = value(formData, "display_name");
  const publicEmail = value(formData, "public_email").toLocaleLowerCase();
  const publicPhone = value(formData, "public_phone");
  const publicWhatsapp = value(formData, "public_whatsapp");
  const bio = value(formData, "bio");

  if (displayName.length < 2 || displayName.length > 120) {
    redirect("/panel/cuenta?estado=nombre-invalido");
  }

  if (bio.length > 2000) {
    redirect("/panel/cuenta?estado=descripcion-invalida");
  }

  if (publicEmail && !isValidEmail(publicEmail)) {
    redirect("/panel/cuenta?estado=correo-invalido");
  }

  const normalizedPhone = normalizePhone(publicPhone);
  if (publicPhone && !normalizedPhone) {
    redirect("/panel/cuenta?estado=telefono-invalido");
  }

  const normalizedWhatsapp = normalizePhone(publicWhatsapp);
  if (publicWhatsapp && !normalizedWhatsapp) {
    redirect("/panel/cuenta?estado=whatsapp-invalido");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      bio: bio || null,
      display_name: displayName,
      public_email: publicEmail || null,
      public_phone: normalizedPhone || null,
      public_whatsapp: normalizedWhatsapp || null,
    })
    .eq("id", context.identity.id);

  if (error) {
    if (
      error.code === "23514" &&
      error.message.includes("published verified listing")
    ) {
      redirect("/panel/cuenta?estado=contacto-requerido");
    }

    redirect("/panel/cuenta?estado=error");
  }

  revalidatePath("/panel", "layout");
  revalidatePath("/propiedades");
  revalidatePath("/propiedades/[slug]", "page");
  redirect("/panel/cuenta?estado=guardado");
}
