"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaffContext } from "@/shared/lib/auth";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import type { Database } from "@/shared/lib/supabase/database.types";

type ModerationAction =
  Database["public"]["Enums"]["moderation_action_type"];

function read(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function moderateListingAction(formData: FormData) {
  await requireStaffContext(undefined, "/admin/revision");

  const listingId = read(formData, "listing_id");
  const version = Number(read(formData, "version"));
  const action = read(formData, "action") as ModerationAction;
  const publicReason = read(formData, "public_reason");
  const internalNotes = read(formData, "internal_notes");

  if (
    !/^[0-9a-f-]{36}$/i.test(listingId) ||
    !Number.isSafeInteger(version) ||
    !["publish", "request_changes", "reject"].includes(action)
  ) {
    redirect("/admin/revision?estado=solicitud-invalida");
  }

  if (
    ["request_changes", "reject"].includes(action) &&
    publicReason.length < 5
  ) {
    redirect("/admin/revision?estado=motivo-requerido");
  }

  const supabase = await createSupabaseServerClient();
  const copiedPaths: string[] = [];

  if (action === "publish") {
    const { data: media, error: mediaError } = await supabase
      .from("listing_media")
      .select("source_path")
      .eq("listing_id", listingId)
      .order("sort_order");

    if (mediaError || !media?.length) {
      redirect("/admin/revision?estado=multimedia-incompleta");
    }

    for (const item of media) {
      const { error } = await supabase.storage
        .from("listing-drafts")
        .copy(item.source_path, item.source_path, {
          destinationBucket: "listing-public",
        });

      if (error) {
        const isExistingObject =
          error.message.toLowerCase().includes("already") ||
          error.message.toLowerCase().includes("duplicate");

        if (!isExistingObject) {
          if (copiedPaths.length > 0) {
            await supabase.storage
              .from("listing-public")
              .remove(copiedPaths);
          }
          redirect("/admin/revision?estado=error-multimedia");
        }
      } else {
        copiedPaths.push(item.source_path);
      }
    }
  }

  const { data: moderatedListing, error } = await supabase.rpc(
    "moderate_listing",
    {
      p_action: action,
      p_expected_version: version,
      p_internal_notes: internalNotes || undefined,
      p_listing_id: listingId,
      p_public_reason: publicReason || undefined,
    },
  );

  if (error) {
    if (copiedPaths.length > 0) {
      await supabase.storage.from("listing-public").remove(copiedPaths);
    }
    redirect("/admin/revision?estado=conflicto");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/revision");
  revalidatePath("/panel/propiedades");
  revalidatePath("/");
  revalidatePath("/propiedades");
  revalidatePath("/sitemap.xml");
  if (moderatedListing?.slug) {
    revalidatePath(`/propiedades/${moderatedListing.slug}`);
  }
  redirect(`/admin/revision?estado=${action}`);
}
