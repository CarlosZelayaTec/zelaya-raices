import { NextResponse, type NextRequest } from "next/server";

import { updateSupabaseSession } from "@/shared/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.hostname.toLowerCase() === "www.zelayaraices.com") {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.hostname = "zelayaraices.com";
    canonicalUrl.protocol = "https:";
    canonicalUrl.port = "";

    return NextResponse.redirect(canonicalUrl, 308);
  }

  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
