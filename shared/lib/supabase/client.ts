"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicSupabaseConfig } from "./config";
import type { Database } from "./database.types";

export function createSupabaseBrowserClient() {
  const { publishableKey, url } = getPublicSupabaseConfig();

  return createBrowserClient<Database>(url, publishableKey);
}
