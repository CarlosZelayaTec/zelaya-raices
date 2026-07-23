import { NextResponse, type NextRequest } from "next/server";

import { applyPrivateNoStore } from "@/shared/lib/auth/http";
import {
  getTrustedOriginFromRequest,
  safeAfterSignInPath,
} from "@/shared/lib/auth/redirects";
import { createSupabaseRouteClient } from "@/shared/lib/supabase/route";

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
  const code = request.nextUrl.searchParams.get("code");
  const providerError = request.nextUrl.searchParams.get("error");

  if (!code || providerError) {
    return noStoreRedirect(request, "/login?estado=enlace-invalido");
  }

  const destination = safeAfterSignInPath(
    request.nextUrl.searchParams.get("next"),
    "/panel",
  );
  const response = noStoreRedirect(request, destination);
  const supabase = createSupabaseRouteClient(request, response);

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return redirectToAuthError(request, response);
  } catch {
    return redirectToAuthError(request, response);
  }

  return response;
}
