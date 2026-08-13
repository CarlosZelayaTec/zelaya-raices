"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  buildAuthCallbackUrl,
  getTrustedRequestOrigin,
  safeAfterSignInPath,
} from "@/shared/lib/auth/redirects";
import {
  normalizeDisplayName,
  normalizeEmail,
  readFormString,
  readFormValue,
  validateDisplayName,
  validateEmail,
  validateLoginPassword,
  validateNewPassword,
} from "@/shared/lib/auth/validation";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

export type AuthActionState = {
  field?:
    | "confirmPassword"
    | "email"
    | "fullName"
    | "password"
    | "publicPhone"
    | "publicWhatsapp";
  message: string;
  status: "error" | "idle" | "success";
};

function errorState(
  message: string,
  field?: AuthActionState["field"],
): AuthActionState {
  return { field, message, status: "error" };
}

function normalizeContactNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (/^[2-9]\d{7}$/.test(digits)) return `+504${digits}`;
  if (/^504[2-9]\d{7}$/.test(digits)) return `+${digits}`;
  if (value.startsWith("+") && /^[1-9]\d{7,14}$/.test(digits)) {
    return `+${digits}`;
  }

  return "";
}

export async function loginAction(
  previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void previousState;

  const email = normalizeEmail(readFormString(formData, "email", 254));
  const password = readFormValue(formData, "password", 128);
  const destination = safeAfterSignInPath(
    readFormString(formData, "next"),
    "/panel",
  );

  const emailError = validateEmail(email);
  if (emailError) return errorState(emailError, "email");

  const passwordError = validateLoginPassword(password);
  if (passwordError) return errorState(passwordError, "password");

  const supabase = await createSupabaseServerClient();

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return errorState(
        "No pudimos iniciar sesión. Revisa tus datos e inténtalo nuevamente.",
      );
    }
  } catch {
    return errorState(
      "No pudimos iniciar sesión en este momento. Inténtalo nuevamente.",
    );
  }

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function signUpAction(
  previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void previousState;

  const fullName = normalizeDisplayName(
    readFormString(formData, "fullName", 120),
  );
  const email = normalizeEmail(readFormString(formData, "email", 254));
  const publicPhone = normalizeContactNumber(
    readFormString(formData, "publicPhone", 30),
  );
  const publicWhatsapp = normalizeContactNumber(
    readFormString(formData, "publicWhatsapp", 30),
  );
  const password = readFormValue(formData, "password", 128);
  const confirmPassword = readFormValue(
    formData,
    "confirmPassword",
    128,
  );
  const destination = safeAfterSignInPath(
    readFormString(formData, "next"),
    "/panel",
  );

  const nameError = validateDisplayName(fullName);
  if (nameError) return errorState(nameError, "fullName");

  const emailError = validateEmail(email);
  if (emailError) return errorState(emailError, "email");

  if (!publicPhone) {
    return errorState(
      "Escribe un teléfono válido, por ejemplo +504 9876-5432.",
      "publicPhone",
    );
  }

  if (!publicWhatsapp) {
    return errorState(
      "Escribe un número de WhatsApp válido, por ejemplo +504 9876-5432.",
      "publicWhatsapp",
    );
  }

  const passwordError = validateNewPassword(password);
  if (passwordError) return errorState(passwordError, "password");

  if (password !== confirmPassword) {
    return errorState("Las contraseñas no coinciden.", "confirmPassword");
  }

  const origin = await getTrustedRequestOrigin();
  const supabase = await createSupabaseServerClient();

  try {
    await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          public_phone: publicPhone,
          public_whatsapp: publicWhatsapp,
        },
        emailRedirectTo: buildAuthCallbackUrl(origin, destination),
      },
    });
  } catch {
    // Deliberately return the same response so this endpoint cannot be used to
    // discover whether an email already has an account.
  }

  return {
    message:
      "Solicitud recibida. Revisa tu correo si se requiere confirmación. Si ya tienes una cuenta, puedes iniciar sesión.",
    status: "success",
  };
}

export async function recoverPasswordAction(
  previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void previousState;

  const email = normalizeEmail(readFormString(formData, "email", 254));
  const emailError = validateEmail(email);
  if (emailError) return errorState(emailError, "email");

  const origin = await getTrustedRequestOrigin();
  const supabase = await createSupabaseServerClient();

  try {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildAuthCallbackUrl(
        origin,
        "/actualizar-contrasena",
      ),
    });
  } catch {
    // Password recovery must not disclose whether an account exists.
  }

  return {
    message:
      "Si existe una cuenta asociada, recibirás un enlace para actualizar tu contraseña.",
    status: "success",
  };
}
