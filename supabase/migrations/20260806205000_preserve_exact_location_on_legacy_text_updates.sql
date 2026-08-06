-- Keep the rollout bridge from replacing an exact private point when the
-- legacy client changes only text fields such as city or zone.
create or replace function private.sync_public_location_point()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  coordinates_changed boolean := false;
  location_changed boolean := false;
  private_address_changed boolean := false;
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
    coordinates_changed :=
      new.public_latitude is distinct from old.public_latitude
      or new.public_longitude is distinct from old.public_longitude;
    private_address_changed :=
      new.visible_address is distinct from old.visible_address;
    location_changed :=
      new.organization_id is distinct from old.organization_id
      or new.country_code is distinct from old.country_code
      or new.department is distinct from old.department
      or new.municipality is distinct from old.municipality
      or new.city is distinct from old.city
      or new.zone is distinct from old.zone
      or private_address_changed
      or coordinates_changed
      or new.precision is distinct from old.precision;
  end if;

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
        when tg_op = 'INSERT' or private_address_changed then coalesce(
          excluded.private_address,
          public.listing_private_locations.private_address
        )
        else public.listing_private_locations.private_address
      end,
      exact_latitude = case
        when tg_op = 'INSERT' or coordinates_changed
          then excluded.exact_latitude
        else public.listing_private_locations.exact_latitude
      end,
      exact_longitude = case
        when tg_op = 'INSERT' or coordinates_changed
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
