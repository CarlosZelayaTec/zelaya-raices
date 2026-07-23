"use server";

import { redirect } from "next/navigation";

import { requireAuthContext } from "@/shared/lib/auth";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

export type OnboardingState = {
  error: string | null;
};

function readValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 82);
}

export async function createOrganizationAction(
  _state: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  await requireAuthContext("/panel/onboarding");

  const organizationType = readValue(formData, "organization_type");
  const name = readValue(formData, "name");
  const legalName = readValue(formData, "legal_name");
  const description = readValue(formData, "description");

  if (
    !["individual_owner", "agency", "business"].includes(organizationType)
  ) {
    return { error: "Selecciona cómo deseas publicar." };
  }

  if (name.length < 2 || name.length > 160) {
    return { error: "Escribe un nombre de cuenta válido." };
  }

  if (description.length > 4000) {
    return { error: "La descripción es demasiado extensa." };
  }

  const suffix = crypto.randomUUID().slice(0, 7);
  const slug = `${slugify(name) || "cuenta"}-${suffix}`;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_organization", {
    p_description: description || undefined,
    p_legal_name: legalName || undefined,
    p_name: name,
    p_organization_type: organizationType as
      | "individual_owner"
      | "agency"
      | "business",
    p_slug: slug,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        error:
          "Ya tienes una cuenta personal de propietario. Puedes usarla para publicar.",
      };
    }

    return {
      error:
        "No pudimos crear la cuenta en este momento. Revisa los datos e inténtalo de nuevo.",
    };
  }

  redirect("/panel?estado=cuenta-creada");
}
