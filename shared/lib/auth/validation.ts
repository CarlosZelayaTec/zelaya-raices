const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function readFormString(
  formData: FormData,
  field: string,
  maxLength = 2048,
): string {
  const value = formData.get(field);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export function readFormValue(
  formData: FormData,
  field: string,
  maxLength = 2048,
): string {
  const value = formData.get(field);
  if (typeof value !== "string") return "";
  return value.slice(0, maxLength);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string): string | null {
  if (!value) return "Escribe tu correo electrónico.";
  if (value.length > 254 || !EMAIL_PATTERN.test(value)) {
    return "Escribe un correo electrónico válido.";
  }
  return null;
}

export function validateLoginPassword(value: string): string | null {
  if (!value) return "Escribe tu contraseña.";
  if (value.length < 6 || value.length > 128) {
    return "Revisa tu contraseña e inténtalo de nuevo.";
  }
  return null;
}

export function validateNewPassword(value: string): string | null {
  if (!value) return "Escribe una contraseña.";
  if (value.length < 10) {
    return "Usa al menos 10 caracteres.";
  }
  if (value.length > 128) {
    return "La contraseña no puede superar 128 caracteres.";
  }
  return null;
}

export function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

export function validateDisplayName(value: string): string | null {
  if (value.length < 2) return "Escribe tu nombre.";
  if (value.length > 120) return "El nombre no puede superar 120 caracteres.";
  return null;
}
