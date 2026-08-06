-- Tighten the anonymous API contract, protect exact coordinates, and make
-- retry-safe Storage uploads possible for registered draft objects.

drop policy if exists listing_drafts_update_registered on storage.objects;
create policy listing_drafts_update_registered
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-drafts'
  and (select private.can_write_listing_draft_object(name))
)
with check (
  bucket_id = 'listing-drafts'
  and (select private.can_write_listing_draft_object(name))
);

alter table public.listing_media
  add constraint listing_media_source_path_extension_check
  check (
    source_path ~ '/original\.(jpg|jpeg|png|webp|avif|mp4|webm|mov|pdf)$'
  );

-- Preserve the currently stored exact point/address before generalizing the
-- public copy. Existing private records always win.
insert into public.listing_private_locations (
  listing_id,
  organization_id,
  private_address,
  exact_latitude,
  exact_longitude,
  exact_geog
)
select
  location.listing_id,
  location.organization_id,
  location.visible_address,
  location.public_latitude,
  location.public_longitude,
  location.public_geog
from public.listing_locations as location
on conflict (listing_id) do update
set private_address = coalesce(
  public.listing_private_locations.private_address,
  excluded.private_address
);

update public.listing_locations as location
set
  public_latitude = round(
    location.public_latitude,
    2
  ),
  public_longitude = round(
    location.public_longitude,
    2
  ),
  visible_address = nullif(
    concat_ws(
      ', ',
      nullif(btrim(location.zone), ''),
      coalesce(
        nullif(btrim(location.city), ''),
        nullif(btrim(location.municipality), '')
      ),
      nullif(btrim(location.department), '')
    ),
    ''
  );

create or replace function private.sync_public_location_point()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  location_changed boolean := false;
  public_label text;
begin
  if new.precision not in ('approximate', 'zone') then
    raise exception 'public precision must be approximate or zone'
      using errcode = '22023';
  end if;

  if (select auth.uid()) is not null
    and not (select private.is_staff())
    and (
      (
        tg_op = 'INSERT'
        and (
          new.location_confirmed_at is not null
          or new.location_confirmed_by is not null
        )
      )
      or (
        tg_op = 'UPDATE'
        and (
          new.location_confirmed_at
            is distinct from old.location_confirmed_at
          or new.location_confirmed_by
            is distinct from old.location_confirmed_by
        )
        and not (
          new.location_confirmed_at is null
          and new.location_confirmed_by is null
        )
      )
    )
  then
    raise exception 'location confirmation fields are protected';
  end if;

  if tg_op = 'UPDATE' then
    location_changed :=
      new.organization_id is distinct from old.organization_id
      or new.country_code is distinct from old.country_code
      or new.department is distinct from old.department
      or new.municipality is distinct from old.municipality
      or new.city is distinct from old.city
      or new.zone is distinct from old.zone
      or new.visible_address is distinct from old.visible_address
      or new.public_latitude is distinct from old.public_latitude
      or new.public_longitude is distinct from old.public_longitude
      or new.precision is distinct from old.precision;
  end if;

  -- Compatibility bridge for the previously deployed wizard. Until the
  -- post-deploy hardening migration revokes direct DML, preserve the exact
  -- point/address before generalizing the public row. The new RPC writes the
  -- private record itself and marks the transaction so this block is skipped.
  if coalesce(
    current_setting('app.location_saved_by_rpc', true),
    '0'
  ) <> '1' then
    insert into public.listing_private_locations (
      listing_id,
      organization_id,
      private_address,
      exact_latitude,
      exact_longitude,
      exact_geog
    )
    values (
      new.listing_id,
      new.organization_id,
      nullif(btrim(new.visible_address), ''),
      new.public_latitude,
      new.public_longitude,
      null
    )
    on conflict (listing_id) do update
    set
      organization_id = excluded.organization_id,
      private_address = case
        when tg_op = 'INSERT' or location_changed then coalesce(
          excluded.private_address,
          public.listing_private_locations.private_address
        )
        else public.listing_private_locations.private_address
      end,
      exact_latitude = case
        when tg_op = 'INSERT' or location_changed
          then excluded.exact_latitude
        else public.listing_private_locations.exact_latitude
      end,
      exact_longitude = case
        when tg_op = 'INSERT' or location_changed
          then excluded.exact_longitude
        else public.listing_private_locations.exact_longitude
      end;
  end if;

  public_label := nullif(
    concat_ws(
      ', ',
      nullif(btrim(new.zone), ''),
      coalesce(
        nullif(btrim(new.city), ''),
        nullif(btrim(new.municipality), '')
      ),
      nullif(btrim(new.department), '')
    ),
    ''
  );

  if location_changed then
    new.location_confirmed_at := null;
    new.location_confirmed_by := null;
  end if;

  -- Direct API writes cannot accidentally expose parcel-level coordinates.
  new.visible_address := public_label;
  new.public_latitude := round(new.public_latitude, 2);
  new.public_longitude := round(new.public_longitude, 2);
  new.public_geog := extensions.st_setsrid(
    extensions.st_makepoint(
      new.public_longitude::double precision,
      new.public_latitude::double precision
    ),
    4326
  )::extensions.geography;

  new.updated_at := now();
  return new;
end;
$$;

alter table public.listing_locations
  add constraint listing_locations_honduras_bounds_check
  check (
    country_code = 'HN'
    and public_latitude between 12.8 and 17.5
    and public_longitude between -89.5 and -82.5
  );

alter table public.listing_locations
  add constraint listing_locations_public_precision_check
  check (precision in ('approximate', 'zone'));

alter table public.listing_private_locations
  add constraint listing_private_locations_honduras_bounds_check
  check (
    exact_latitude between 12.8 and 17.5
    and exact_longitude between -89.5 and -82.5
  );

create or replace function public.save_listing_location(
  p_listing_id uuid,
  p_organization_id uuid,
  p_department text,
  p_municipality text,
  p_exact_latitude numeric,
  p_exact_longitude numeric,
  p_precision public.location_precision,
  p_city text default null,
  p_zone text default null,
  p_private_address text default null
)
returns table (saved_listing_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_listing public.listings;
  public_label text;
begin
  if current_user_id is null then
    raise exception 'authentication required'
      using errcode = '42501';
  end if;

  select listing.*
  into target_listing
  from public.listings as listing
  where listing.id = p_listing_id
  for update;

  if not found then
    raise exception 'listing not found'
      using errcode = 'P0002';
  end if;

  if p_organization_id is null
    or target_listing.organization_id <> p_organization_id
    or not (select private.can_edit_listing_draft(p_listing_id))
  then
    raise exception 'editable listing access required'
      using errcode = '42501';
  end if;

  if p_precision is null
    or p_precision not in ('approximate', 'zone')
  then
    raise exception 'public precision must be approximate or zone'
      using errcode = '22023';
  end if;

  if p_exact_latitude is null
    or p_exact_longitude is null
    or p_exact_latitude::text = 'NaN'
    or p_exact_longitude::text = 'NaN'
    or p_exact_latitude not between 12.8 and 17.5
    or p_exact_longitude not between -89.5 and -82.5
  then
    raise exception 'coordinates must be located in Honduras'
      using errcode = '22023';
  end if;

  if char_length(btrim(coalesce(p_department, ''))) < 2
    or char_length(btrim(coalesce(p_department, ''))) > 120
    or char_length(btrim(coalesce(p_municipality, ''))) < 2
    or char_length(btrim(coalesce(p_municipality, ''))) > 120
    or char_length(coalesce(p_city, '')) > 120
    or char_length(coalesce(p_zone, '')) > 160
    or char_length(coalesce(p_private_address, '')) > 1000
  then
    raise exception 'location text is outside the allowed range'
      using errcode = '22023';
  end if;

  public_label := nullif(
    concat_ws(
      ', ',
      nullif(btrim(p_zone), ''),
      coalesce(
        nullif(btrim(p_city), ''),
        nullif(btrim(p_municipality), '')
      ),
      nullif(btrim(p_department), '')
    ),
    ''
  );

  insert into public.listing_private_locations (
    listing_id,
    organization_id,
    private_address,
    exact_latitude,
    exact_longitude,
    exact_geog
  )
  values (
    target_listing.id,
    target_listing.organization_id,
    nullif(btrim(p_private_address), ''),
    p_exact_latitude,
    p_exact_longitude,
    null
  )
  on conflict (listing_id) do update
  set
    organization_id = excluded.organization_id,
    private_address = excluded.private_address,
    exact_latitude = excluded.exact_latitude,
    exact_longitude = excluded.exact_longitude;

  perform set_config('app.location_saved_by_rpc', '1', true);

  insert into public.listing_locations (
    listing_id,
    organization_id,
    country_code,
    department,
    municipality,
    city,
    zone,
    visible_address,
    public_latitude,
    public_longitude,
    public_geog,
    precision
  )
  values (
    target_listing.id,
    target_listing.organization_id,
    'HN',
    btrim(p_department),
    btrim(p_municipality),
    nullif(btrim(p_city), ''),
    nullif(btrim(p_zone), ''),
    public_label,
    round(p_exact_latitude, 2),
    round(p_exact_longitude, 2),
    null,
    p_precision
  )
  on conflict (listing_id) do update
  set
    organization_id = excluded.organization_id,
    country_code = excluded.country_code,
    department = excluded.department,
    municipality = excluded.municipality,
    city = excluded.city,
    zone = excluded.zone,
    visible_address = excluded.visible_address,
    public_latitude = excluded.public_latitude,
    public_longitude = excluded.public_longitude,
    precision = excluded.precision,
    location_confirmed_at = null,
    location_confirmed_by = null;

  perform set_config('app.location_saved_by_rpc', '0', true);
  return query select target_listing.id;
end;
$$;

revoke all on function public.save_listing_location(
  uuid, uuid, text, text, numeric, numeric,
  public.location_precision, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.save_listing_location(
  uuid, uuid, text, text, numeric, numeric,
  public.location_precision, text, text, text
) to authenticated;

-- The previous frontend never writes the private table. Close this bypass
-- immediately; the compatibility trigger above writes it as SECURITY DEFINER.
drop policy if exists listing_private_locations_insert_managers
  on public.listing_private_locations;
drop policy if exists listing_private_locations_update_managers
  on public.listing_private_locations;
drop policy if exists listing_private_locations_delete_managers
  on public.listing_private_locations;
revoke all privileges on table public.listing_private_locations
  from authenticated;
grant select on table public.listing_private_locations to authenticated;

-- An authenticated token must not turn a public row into an administrative
-- row. Public browsing uses the anonymous catalog client; authenticated table
-- access is reserved for the user's own rows or staff scope.
drop policy if exists profiles_select_public_or_self on public.profiles;
create policy profiles_select_public
on public.profiles
for select
to anon
using (
  account_status = 'active'
  and verification_status = 'verified'
);
create policy profiles_select_self_or_staff
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_staff())
);

drop policy if exists organizations_select_public_or_member
  on public.organizations;
create policy organizations_select_public
on public.organizations
for select
to anon
using (
  status = 'active'
  and verification_status = 'verified'
);
create policy organizations_select_member_or_staff
on public.organizations
for select
to authenticated
using (
  (select private.is_org_member(id))
  or (select private.is_staff())
);

drop policy if exists listings_select_published on public.listings;
create policy listings_select_public
on public.listings
for select
to anon
using ((select private.is_listing_public(id)));
create policy listings_select_managed
on public.listings
for select
to authenticated
using ((select private.can_view_listing(id)));

drop policy if exists listing_media_select_public_or_managed
  on public.listing_media;
create policy listing_media_select_public
on public.listing_media
for select
to anon
using (
  processing_status = 'ready'
  and public_path is not null
  and (select private.is_listing_public(listing_id))
);
create policy listing_media_select_managed
on public.listing_media
for select
to authenticated
using ((select private.can_view_listing(listing_id)));

drop policy if exists listing_locations_select_public_or_managed
  on public.listing_locations;
create policy listing_locations_select_public
on public.listing_locations
for select
to anon
using ((select private.is_listing_public(listing_id)));
create policy listing_locations_select_managed
on public.listing_locations
for select
to authenticated
using ((select private.can_view_listing(listing_id)));

drop policy if exists listing_price_history_select_public_or_managed
  on public.listing_price_history;
create policy listing_price_history_select_public
on public.listing_price_history
for select
to anon
using ((select private.is_listing_public(listing_id)));
create policy listing_price_history_select_managed
on public.listing_price_history
for select
to authenticated
using ((select private.can_view_listing(listing_id)));

-- Anonymous visitors receive a deliberate public contract rather than every
-- column on rows that pass RLS.
revoke select on public.profiles from anon;
grant select (
  id, display_name, slug, avatar_path, bio, public_phone, public_whatsapp,
  verification_status, verified_at, created_at, updated_at
) on public.profiles to anon;

revoke select on public.organizations from anon;
grant select (
  id, organization_type, name, slug, description, logo_path, website_url,
  public_email, public_phone, verification_status, verified_at, status,
  created_at, updated_at
) on public.organizations to anon;

revoke select on public.listings from anon;
grant select (
  id, organization_id, title, slug, description, operation_type,
  property_type, publication_status, availability_status, price_amount,
  price_on_request, currency_code, price_period, bedrooms, bathrooms,
  parking_spaces, land_area, land_area_unit, construction_area,
  construction_area_unit, year_built, verification_status, verified_at,
  featured_until, published_at, last_price_update_at,
  availability_updated_at, reports_count, created_at, updated_at
) on public.listings to anon;

revoke select on public.listing_media from anon;
grant select (
  id, listing_id, organization_id, media_type, processing_status, mime_type,
  size_bytes, width, height, duration_seconds, public_bucket, public_path,
  alt_text, sort_order, is_primary, created_at, updated_at
) on public.listing_media to anon;

revoke select on public.listing_locations from anon;
grant select (
  listing_id, organization_id, country_code, department, municipality, city,
  zone, visible_address, precision, location_confirmed_at, created_at,
  updated_at
) on public.listing_locations to anon;

revoke select on public.listing_price_history from anon;
grant select (
  id, listing_id, previous_price_amount, new_price_amount,
  previous_currency_code, new_currency_code, previous_price_period,
  new_price_period, changed_at
) on public.listing_price_history to anon;
