-- A listing page needs a public reference point for the map, but parcel-level
-- coordinates and the private address must remain outside the public API.
-- The public values are already rounded by the location write contract.
create or replace function public.get_public_listing_map_location(
  p_listing_id uuid
)
returns table (
  public_latitude numeric,
  public_longitude numeric,
  location_precision public.location_precision,
  location_confirmed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    location.public_latitude,
    location.public_longitude,
    location.precision as location_precision,
    location.location_confirmed_at is not null
  from public.listings as listing
  join public.listing_locations as location
    on location.listing_id = listing.id
  where listing.id = p_listing_id
    and listing.verification_status = 'verified'::public.verification_status
    and (select private.is_listing_public(listing.id));
$$;

revoke all on function public.get_public_listing_map_location(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_public_listing_map_location(uuid)
  to anon, authenticated;
