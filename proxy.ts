import type { NextRequest } from "next/server";

import { updateSupabaseSession } from "@/shared/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/login",
    "/auth/:path*",
    "/panel/:path*",
    "/admin/:path*",
    "/actualizar-contrasena",
    "/activar-administracion/:path*",
  ],
};
