-- Guarded, atomic editing path for an already published listing.
--
-- A published advertisement may change its core listing data only by moving
-- back to pending_review. Location and media remain deliberately outside this
-- endpoint: changing them needs the richer revision workflow that preserves
-- the prior public version until moderation is complete.
create or replace function public.submit_published_listing_revision(
  p_listing_id uuid,
  p_expected_version bigint,
  p_title text,
  p_description text,
  p_operation_type public.operation_type,
  p_property_type public.property_type,
  p_price_amount numeric,
  p_price_on_request boolean,
  p_currency_code public.currency_code,
  p_price_period public.price_period,
  p_bedrooms smallint default null,
  p_bathrooms numeric default null,
  p_parking_spaces smallint default null,
  p_land_area numeric default null,
  p_land_area_unit public.area_unit default null,
  p_construction_area numeric default null,
  p_construction_area_unit public.area_unit default null,
  p_year_built smallint default null
)
returns public.listings
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_listing public.listings;
begin
  select listing.*
  into target_listing
  from public.listings as listing
  where listing.id = p_listing_id
  for update;

  if not found then
    raise exception 'listing not found'
      using errcode = 'P0002';
  end if;

  if (select auth.uid()) is null
    or not (select private.can_manage_listing(p_listing_id))
  then
    raise exception 'listing management access required'
      using errcode = '42501';
  end if;

  if target_listing.publication_status <> 'published' then
    raise exception 'only published listings can enter the revision workflow'
      using errcode = '55000';
  end if;

  if target_listing.version <> p_expected_version then
    raise exception 'stale listing version'
      using errcode = '40001';
  end if;

  update public.listings
  set
    title = btrim(p_title),
    description = btrim(p_description),
    operation_type = p_operation_type,
    property_type = p_property_type,
    price_amount = p_price_amount,
    price_on_request = p_price_on_request,
    currency_code = p_currency_code,
    price_period = p_price_period,
    bedrooms = p_bedrooms,
    bathrooms = p_bathrooms,
    parking_spaces = p_parking_spaces,
    land_area = p_land_area,
    land_area_unit = p_land_area_unit,
    construction_area = p_construction_area,
    construction_area_unit = p_construction_area_unit,
    year_built = p_year_built,
    publication_status = 'pending_review'
  where id = p_listing_id
  returning * into target_listing;

  return target_listing;
end;
$$;

revoke all on function public.submit_published_listing_revision(
  uuid, bigint, text, text, public.operation_type, public.property_type,
  numeric, boolean, public.currency_code, public.price_period, smallint,
  numeric, smallint, numeric, public.area_unit, numeric, public.area_unit,
  smallint
) from public, anon, authenticated, service_role;

grant execute on function public.submit_published_listing_revision(
  uuid, bigint, text, text, public.operation_type, public.property_type,
  numeric, boolean, public.currency_code, public.price_period, smallint,
  numeric, smallint, numeric, public.area_unit, numeric, public.area_unit,
  smallint
) to authenticated;
