-- Apply only after the RPC-based listing wizard is live. This closes the
-- compatibility window kept by the preceding migration.

revoke all on function public.register_listing_media(
  uuid, public.listing_media_type, text, bigint, text
) from public, anon, authenticated, service_role;
drop function public.register_listing_media(
  uuid, public.listing_media_type, text, bigint, text
);

drop policy if exists listing_locations_insert_managers
  on public.listing_locations;
drop policy if exists listing_locations_update_managers
  on public.listing_locations;
drop policy if exists listing_locations_delete_managers
  on public.listing_locations;

revoke all privileges on table public.listing_locations from authenticated;
grant select on table public.listing_locations to authenticated;

-- Exact/private location writes now have a single guarded entry point:
-- public.save_listing_location(...). Staff/service-role workflows that need a
-- different mutation must use a separately reviewed administrative RPC.
