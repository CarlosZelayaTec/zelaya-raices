import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import {
  applyPrivateNoStore,
  applyResponseHeaders,
} from "@/shared/lib/auth/http";
import { getPublicSupabaseConfig } from "./config";
import type { Database } from "./database.types";

export function createSupabaseRouteClient(
  request: NextRequest,
  response: NextResponse,
) {
  const { publishableKey, url } = getPublicSupabaseConfig();
  applyPrivateNoStore(response);

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, options, value } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        applyResponseHeaders(response, headers);
      },
    },
  });
}
