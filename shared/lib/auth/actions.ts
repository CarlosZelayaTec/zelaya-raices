"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { safeSignedOutPath } from "./redirects";
import { readFormString } from "./validation";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

export async function signOutAction(formData: FormData): Promise<never> {
  const destination = safeSignedOutPath(
    readFormString(formData, "next"),
    "/login?estado=sesion-cerrada",
  );
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });

  revalidatePath("/", "layout");

  if (error) {
    redirect("/login?estado=error-sesion");
  }

  redirect(destination);
}
