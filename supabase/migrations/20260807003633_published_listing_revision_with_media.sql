-- Guarded revision path for a published listing whose existing media order
-- also changes. New media uploads and location changes remain intentionally
-- outside this endpoint.
create or replace function public.submit_published_listing_revision_with_media(
  p_listing_id uuid,
  p_expected_version bigint,
  p_ordered_media_ids uuid[],
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
  current_user_id uuid := (select auth.uid());
  target_listing public.listings;
  ordered_count integer;
  distinct_count integer;
  registered_count integer;
  matched_count integer;
  primary_media_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication required'
      using errcode = '42501';
  end if;

  if p_ordered_media_ids is null then
    raise exception 'ordered media IDs are required'
      using errcode = '22023';
  end if;

  ordered_count := cardinality(p_ordered_media_ids);

  if ordered_count < 1 then
    raise exception 'a published listing revision must retain media'
      using errcode = '23514';
  end if;

  if ordered_count > 12 then
    raise exception 'a listing can contain at most 12 media items'
      using errcode = '23514';
  end if;

  select count(distinct ordered.media_id)
  into distinct_count
  from unnest(p_ordered_media_ids) as ordered(media_id);

  if distinct_count <> ordered_count then
    raise exception 'ordered media IDs must be unique and non-null'
      using errcode = '22023';
  end if;

  -- The parent lock serializes this revision with all registered media
  -- mutations. The subsequent media-row locks also protect against a staff
  -- workflow changing the collection directly while this revision runs.
  select listing.*
  into target_listing
  from public.listings as listing
  where listing.id = p_listing_id
  for update;

  if not found then
    raise exception 'listing not found'
      using errcode = 'P0002';
  end if;

  if not (select private.can_manage_listing(p_listing_id)) then
    raise exception 'listing management access required'
      using errcode = '42501';
  end if;

  if target_listing.publication_status <> 'published' then
    raise exception 'only published listings can enter the revision workflow'
      using errcode = '55000';
  end if;

  if target_listing.version is distinct from p_expected_version then
    raise exception 'stale listing version'
      using errcode = '40001';
  end if;

  perform media.id
  from public.listing_media as media
  where media.listing_id = p_listing_id
  order by media.id
  for update;

  select count(*)
  into registered_count
  from public.listing_media as media
  where media.listing_id = p_listing_id;

  select count(*)
  into matched_count
  from public.listing_media as media
  where media.listing_id = p_listing_id
    and media.id = any (p_ordered_media_ids);

  if ordered_count <> registered_count
    or matched_count <> registered_count
  then
    raise exception 'ordered media IDs must exactly match the listing media'
      using errcode = '22023';
  end if;

  select ordered.media_id
  into primary_media_id
  from unnest(p_ordered_media_ids) with ordinality
    as ordered(media_id, sort_position)
  join public.listing_media as media
    on media.id = ordered.media_id
   and media.listing_id = p_listing_id
  where media.media_type = 'image'
  order by ordered.sort_position
  limit 1;

  if primary_media_id is null then
    raise exception 'a published listing revision requires at least one image'
      using errcode = '23514';
  end if;

  -- This update invokes the normal listing workflow and contact-detail
  -- safeguards. If either this or the media updates fail, PostgreSQL rolls
  -- back the entire RPC call.
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

  -- Clear the prior cover before assigning the first image in the requested
  -- order because the partial unique index for primary media is immediate.
  update public.listing_media as media
  set is_primary = false
  where media.listing_id = p_listing_id
    and media.is_primary;

  update public.listing_media as media
  set sort_order = (ordered.sort_position - 1)::smallint
  from unnest(p_ordered_media_ids) with ordinality
    as ordered(media_id, sort_position)
  where media.listing_id = p_listing_id
    and media.id = ordered.media_id;

  update public.listing_media as media
  set is_primary = true
  where media.id = primary_media_id
    and media.listing_id = p_listing_id;

  return target_listing;
end;
$$;

revoke all on function public.submit_published_listing_revision_with_media(
  uuid, bigint, uuid[], text, text, public.operation_type,
  public.property_type, numeric, boolean, public.currency_code,
  public.price_period, smallint, numeric, smallint, numeric,
  public.area_unit, numeric, public.area_unit, smallint
) from public, anon, authenticated, service_role;

grant execute on function public.submit_published_listing_revision_with_media(
  uuid, bigint, uuid[], text, text, public.operation_type,
  public.property_type, numeric, boolean, public.currency_code,
  public.price_period, smallint, numeric, smallint, numeric,
  public.area_unit, numeric, public.area_unit, smallint
) to authenticated;
