"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthContext } from "@/shared/lib/auth";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import type { Database } from "@/shared/lib/supabase/database.types";

type AvailabilityStatus =
  Database["public"]["Enums"]["availability_status"];

export async function updateAvailabilityAction(formData: FormData) {
  await requireAuthContext("/panel/propiedades");
  const listingId = formData.get("listing_id");
  const availability = formData.get("availability_status");
  const allowed: AvailabilityStatus[] = [
    "available",
    "reserved",
    "sold",
    "rented",
    "unavailable",
  ];

  if (
    typeof listingId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(listingId) ||
    typeof availability !== "string" ||
    !allowed.includes(availability as AvailabilityStatus)
  ) {
    redirect("/panel/propiedades?estado=solicitud-invalida");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("listings")
    .update({
      availability_status: availability as AvailabilityStatus,
    })
    .eq("id", listingId);

  if (error) {
    redirect("/panel/propiedades?estado=no-actualizada");
  }

  revalidatePath("/panel");
  revalidatePath("/panel/propiedades");
  redirect("/panel/propiedades?estado=disponibilidad-actualizada");
}

