import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2.110.8";

const allowedOrigins = new Set([
  "https://zelayaraices.com",
  "https://www.zelayaraices.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": allowedOrigins.has(origin)
      ? origin
      : "https://www.zelayaraices.com",
    Vary: "Origin",
  };
}

function json(request: Request, body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: corsHeaders(request),
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method !== "POST") {
    return json(request, { error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const authorization = request.headers.get("authorization");

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return json(request, { error: "service_not_configured" }, 503);
  }

  if (!resendApiKey) {
    return json(request, { error: "email_provider_not_configured" }, 503);
  }

  let body: { listingId?: unknown; version?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(request, { error: "invalid_json" }, 400);
  }

  const listingId = typeof body.listingId === "string" ? body.listingId : "";
  const version =
    typeof body.version === "number" && Number.isSafeInteger(body.version)
      ? body.version
      : 0;

  if (!uuidPattern.test(listingId) || version < 1) {
    return json(request, { error: "invalid_request" }, 400);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();

  if (userError || !userData.user) {
    return json(request, { error: "authentication_required" }, 401);
  }

  const { data: listing, error: listingError } = await userClient
    .from("listings")
    .select("id,title,version,publication_status,updated_at,organizations(name)")
    .eq("id", listingId)
    .eq("version", version)
    .eq("publication_status", "pending_review")
    .maybeSingle();

  if (listingError || !listing) {
    return json(request, { error: "pending_listing_not_found" }, 404);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { data: reservation, error: reservationError } = await adminClient
    .from("listing_review_notifications")
    .insert({
      listing_id: listing.id,
      listing_version: listing.version,
      status: "sending",
    })
    .select("id,status,attempt_count")
    .maybeSingle();

  let notification = reservation;

  if (reservationError?.code === "23505") {
    const { data: existing } = await adminClient
      .from("listing_review_notifications")
      .select("id,status,attempt_count")
      .eq("listing_id", listing.id)
      .eq("listing_version", listing.version)
      .maybeSingle();

    if (!existing || existing.status === "sent" || existing.status === "sending") {
      return json(request, { delivered: existing?.status === "sent" });
    }

    const { data: retry } = await adminClient
      .from("listing_review_notifications")
      .update({
        status: "sending",
        attempt_count: Math.min(existing.attempt_count + 1, 10),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("status", "failed")
      .select("id,status,attempt_count")
      .maybeSingle();
    notification = retry;
  } else if (reservationError) {
    return json(request, { error: "notification_reservation_failed" }, 500);
  }

  if (!notification) {
    return json(request, { delivered: false });
  }

  const organization = Array.isArray(listing.organizations)
    ? listing.organizations[0]
    : listing.organizations;
  const recipient =
    Deno.env.get("REVIEW_NOTIFICATION_TO") ?? "czelayabaca@gmail.com";
  const sender =
    Deno.env.get("REVIEW_NOTIFICATION_FROM") ??
    "Zelaya Raíces <notificaciones@zelayaraices.com>";
  const reviewUrl = "https://www.zelayaraices.com/admin/revision";
  const safeTitle = escapeHtml(listing.title);
  const safeOrganization = escapeHtml(
    organization?.name ?? "Cuenta inmobiliaria",
  );

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: sender,
      to: [recipient],
      subject: `Anuncio pendiente de revisión: ${listing.title}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#0b3440;line-height:1.6">
          <h1 style="font-size:22px">Hay un anuncio pendiente de revisión</h1>
          <p><strong>${safeTitle}</strong></p>
          <p>Publicado por: ${safeOrganization}</p>
          <p>La información y su galería ya están disponibles en el panel administrativo.</p>
          <p><a href="${reviewUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#0b4655;color:#fff;text-decoration:none">Revisar anuncio</a></p>
        </div>
      `,
    }),
  });

  if (!emailResponse.ok) {
    const providerError = (await emailResponse.text()).slice(0, 900);
    await adminClient
      .from("listing_review_notifications")
      .update({
        status: "failed",
        last_error: providerError || `HTTP ${emailResponse.status}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", notification.id);

    return json(request, { error: "email_delivery_failed" }, 502);
  }

  await adminClient
    .from("listing_review_notifications")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", notification.id);

  return json(request, { delivered: true });
});
