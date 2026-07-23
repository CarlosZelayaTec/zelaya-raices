import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { applyPrivateNoStore } from "@/shared/lib/auth/http";
import {
  getTrustedOriginFromRequest,
  safeAfterSignInPath,
} from "@/shared/lib/auth/redirects";
import { createSupabaseRouteClient } from "@/shared/lib/supabase/route";

const ALLOWED_EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  "email",
  "email_change",
  "invite",
  "magiclink",
  "recovery",
  "signup",
]);

function noStoreRedirect(
  request: NextRequest,
  destination: string,
): NextResponse {
  const origin = getTrustedOriginFromRequest(request);
  return applyPrivateNoStore(
    NextResponse.redirect(new URL(destination, origin), 303),
  );
}

function redirectToAuthError(request: NextRequest, response: NextResponse) {
  const origin = getTrustedOriginFromRequest(request);
  response.headers.set(
    "Location",
    new URL("/login?estado=enlace-invalido", origin).toString(),
  );
  return applyPrivateNoStore(response);
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get("type");

  if (
    !tokenHash ||
    !rawType ||
    !ALLOWED_EMAIL_OTP_TYPES.has(rawType as EmailOtpType)
  ) {
    return noStoreRedirect(request, "/login?estado=enlace-invalido");
  }

  const type = rawType as EmailOtpType;
  const destination =
    type === "recovery"
      ? "/actualizar-contrasena"
      : safeAfterSignInPath(
          request.nextUrl.searchParams.get("next"),
          "/panel",
        );
  const response = noStoreRedirect(request, destination);
  const supabase = createSupabaseRouteClient(request, response);

  try {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) return redirectToAuthError(request, response);
  } catch {
    return redirectToAuthError(request, response);
  }

  return response;
}
