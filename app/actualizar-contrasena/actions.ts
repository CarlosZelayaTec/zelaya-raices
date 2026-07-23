"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  readFormValue,
  validateNewPassword,
} from "@/shared/lib/auth/validation";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

export type PasswordActionState = {
  field?: "confirmPassword" | "password";
  message: string;
  status: "error" | "idle";
};

function errorState(
  message: string,
  field?: PasswordActionState["field"],
): PasswordActionState {
  return { field, message, status: "error" };
}

export async function updatePasswordAction(
  previousState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  void previousState;

  const password = readFormValue(formData, "password", 128);
  const confirmPassword = readFormValue(
    formData,
    "confirmPassword",
    128,
  );
  const passwordError = validateNewPassword(password);

  if (passwordError) return errorState(passwordError, "password");
  if (password !== confirmPassword) {
    return errorState("Las contraseñas no coinciden.", "confirmPassword");
  }

  const supabase = await createSupabaseServerClient();
  const claimsResult = await supabase.auth.getClaims().catch(() => null);

  if (
    !claimsResult ||
    claimsResult.error ||
    !claimsResult.data?.claims ||
    claimsResult.data.claims.is_anonymous === true
  ) {
    return errorState(
      "El enlace ya no es válido. Solicita uno nuevo para continuar.",
    );
  }

  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return errorState(
        "No pudimos actualizar la contraseña. Solicita un enlace nuevo e inténtalo otra vez.",
      );
    }
  } catch {
    return errorState(
      "No pudimos actualizar la contraseña en este momento. Inténtalo nuevamente.",
    );
  }

  try {
    await supabase.auth.signOut({ scope: "others" });
  } catch {
    // The password is already updated. Failure to close other sessions should
    // not misreport the completed password change to the user.
  }

  revalidatePath("/", "layout");
  redirect("/panel?estado=contrasena-actualizada");
}
