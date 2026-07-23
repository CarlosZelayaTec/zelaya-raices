import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  applyPrivateNoStore,
  applyResponseHeaders,
} from "@/shared/lib/auth/http";
import { getPublicSupabaseConfig } from "./config";
import type { Database } from "./database.types";

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { publishableKey, url } = getPublicSupabaseConfig();

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, options, value } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        applyResponseHeaders(response, headers);
      },
    },
  });

  // Keep this call immediately after client creation. It validates the JWT and
  // refreshes expired credentials before a protected Server Component renders.
  await supabase.auth.getClaims();

  return applyPrivateNoStore(response);
}
