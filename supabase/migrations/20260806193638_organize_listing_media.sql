-- Keep listing media deterministic and make cover selection an atomic action.
-- Authenticated clients register files one at a time, but every registration
-- and reorder is serialized through the parent listing row.

-- Older drafts could have marked a video as primary. Clear those values first
-- and promote the first image in display order when a listing has no cover.
update public.listing_media
set is_primary = false
where is_primary
  and media_type <> 'image';

with first_images as (
  select distinct on (media.listing_id)
    media.id,
    media.listing_id
  from public.listing_media as media
  where media.media_type = 'image'
    and not exists (
      select 1
      from public.listing_media as primary_media
      where primary_media.listing_id = media.listing_id
        and primary_media.is_primary
    )
  order by
    media.listing_id,
    media.sort_order,
    media.created_at,
    media.id
)
update public.listing_media as media
set is_primary = true
from first_images
where media.id = first_images.id;

alter table public.listing_media
  add constraint listing_media_primary_requires_image_check
  check (not is_primary or media_type = 'image');

create or replace function public.register_listing_media(
  p_listing_id uuid,
  p_media_type public.listing_media_type,
  p_mime_type text,
  p_size_bytes bigint,
  p_extension text
)
returns public.listing_media
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_listing public.listings;
  created_media public.listing_media;
  media_id uuid := gen_random_uuid();
  normalized_extension text :=
    lower(regexp_replace(btrim(p_extension), '^\.', ''));
  object_path text;
  current_media_count integer;
  next_sort_order smallint;
  should_be_primary boolean;
begin
  if current_user_id is null then
    raise exception 'authentication required'
      using errcode = '42501';
  end if;

  -- This lock serializes registration with every other register/reorder call
  -- for the same listing, preventing duplicate positions or cover races.
  select listing.*
  into target_listing
  from public.listings as listing
  where listing.id = p_listing_id
  for update;

  if not found then
    raise exception 'listing not found'
      using errcode = 'P0002';
  end if;

  if not (select private.can_edit_listing_draft(p_listing_id)) then
    raise exception 'editable listing access required'
      using errcode = '42501';
  end if;

  if p_size_bytes <= 0 or p_size_bytes > 52428800 then
    raise exception 'file size is outside the allowed range'
      using errcode = '22023';
  end if;

  if not (
    (normalized_extension in ('jpg', 'jpeg')
      and p_mime_type = 'image/jpeg')
    or (normalized_extension = 'png' and p_mime_type = 'image/png')
    or (normalized_extension = 'webp' and p_mime_type = 'image/webp')
    or (normalized_extension = 'avif' and p_mime_type = 'image/avif')
    or (normalized_extension = 'mp4' and p_mime_type = 'video/mp4')
    or (normalized_extension = 'webm' and p_mime_type = 'video/webm')
    or (normalized_extension = 'mov'
      and p_mime_type = 'video/quicktime')
    or (normalized_extension = 'pdf'
      and p_mime_type = 'application/pdf')
  ) then
    raise exception 'extension and MIME type do not match'
      using errcode = '22023';
  end if;

  if (
    p_media_type = 'image'
    and p_mime_type not like 'image/%'
  ) or (
    p_media_type = 'video'
    and p_mime_type not like 'video/%'
  ) or (
    p_media_type = 'floor_plan'
    and p_mime_type <> 'application/pdf'
    and p_mime_type not like 'image/%'
  ) then
    raise exception 'media type and MIME type do not match'
      using errcode = '22023';
  end if;

  select
    count(*),
    (coalesce(max(media.sort_order), -1) + 1)::smallint
  into current_media_count, next_sort_order
  from public.listing_media as media
  where media.listing_id = p_listing_id;

  if current_media_count >= 12 then
    raise exception 'a listing can contain at most 12 media items'
      using errcode = '23514';
  end if;

  should_be_primary :=
    p_media_type = 'image'
    and not exists (
      select 1
      from public.listing_media as primary_media
      where primary_media.listing_id = p_listing_id
        and primary_media.is_primary
    );

  object_path := format(
    'organizations/%s/listings/%s/%s/original.%s',
    target_listing.organization_id,
    target_listing.id,
    media_id,
    normalized_extension
  );

  insert into public.listing_media (
    id,
    listing_id,
    organization_id,
    media_type,
    source_bucket,
    source_path,
    processing_status,
    mime_type,
    size_bytes,
    sort_order,
    is_primary,
    created_by
  )
  values (
    media_id,
    target_listing.id,
    target_listing.organization_id,
    p_media_type,
    'listing-drafts',
    object_path,
    'pending',
    p_mime_type,
    p_size_bytes,
    next_sort_order,
    should_be_primary,
    current_user_id
  )
  returning * into created_media;

  return created_media;
end;
$$;

create or replace function public.organize_listing_media(
  p_listing_id uuid,
  p_ordered_ids uuid[]
)
returns setof public.listing_media
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

  if p_ordered_ids is null then
    raise exception 'ordered media IDs are required'
      using errcode = '22023';
  end if;

  ordered_count := cardinality(p_ordered_ids);

  if ordered_count > 12 then
    raise exception 'a listing can contain at most 12 media items'
      using errcode = '23514';
  end if;

  select count(distinct ordered.media_id)
  into distinct_count
  from unnest(p_ordered_ids) as ordered(media_id);

  if distinct_count <> ordered_count then
    raise exception 'ordered media IDs must be unique and non-null'
      using errcode = '22023';
  end if;

  -- Every media mutation locks the parent first. Media rows are then locked in
  -- UUID order so concurrent deletes cannot create a partial reorder.
  select listing.*
  into target_listing
  from public.listings as listing
  where listing.id = p_listing_id
  for update;

  if not found then
    raise exception 'listing not found'
      using errcode = 'P0002';
  end if;

  if not (select private.can_edit_listing_draft(p_listing_id)) then
    raise exception 'editable listing access required'
      using errcode = '42501';
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
    and media.id = any (p_ordered_ids);

  if ordered_count <> registered_count
    or matched_count <> registered_count
  then
    raise exception 'ordered media IDs must exactly match the listing media'
      using errcode = '22023';
  end if;

  select ordered.media_id
  into primary_media_id
  from unnest(p_ordered_ids) with ordinality
    as ordered(media_id, sort_position)
  join public.listing_media as media
    on media.id = ordered.media_id
   and media.listing_id = p_listing_id
  where media.media_type = 'image'
  order by ordered.sort_position
  limit 1;

  -- Clear the prior cover before setting the next one because the existing
  -- partial unique index is intentionally non-deferrable.
  update public.listing_media as media
  set is_primary = false
  where media.listing_id = p_listing_id
    and media.is_primary;

  update public.listing_media as media
  set sort_order = (ordered.sort_position - 1)::smallint
  from unnest(p_ordered_ids) with ordinality
    as ordered(media_id, sort_position)
  where media.listing_id = p_listing_id
    and media.id = ordered.media_id;

  if primary_media_id is not null then
    update public.listing_media as media
    set is_primary = true
    where media.id = primary_media_id
      and media.listing_id = p_listing_id;
  end if;

  return query
  select media.*
  from public.listing_media as media
  where media.listing_id = p_listing_id
  order by media.sort_order, media.created_at, media.id;
end;
$$;

revoke all on function public.register_listing_media(
  uuid, public.listing_media_type, text, bigint, text
) from public, anon, authenticated, service_role;
grant execute on function public.register_listing_media(
  uuid, public.listing_media_type, text, bigint, text
) to authenticated;

revoke all on function public.organize_listing_media(uuid, uuid[])
  from public, anon, authenticated, service_role;
grant execute on function public.organize_listing_media(uuid, uuid[])
  to authenticated;

-- Ordering and cover selection must go through the atomic RPC above.
revoke update (sort_order, is_primary)
  on public.listing_media from authenticated;
