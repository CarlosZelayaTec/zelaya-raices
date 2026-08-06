-- Add a retry-safe registration overload before the frontend starts using it.
-- The legacy five-argument function remains temporarily available so the
-- currently deployed frontend keeps working during the rollout.
create or replace function public.register_listing_media(
  p_listing_id uuid,
  p_media_type public.listing_media_type,
  p_mime_type text,
  p_size_bytes bigint,
  p_extension text,
  p_media_id uuid
)
returns public.listing_media
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_listing public.listings;
  existing_media public.listing_media;
  created_media public.listing_media;
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

  if p_media_id is null then
    raise exception 'media ID is required'
      using errcode = '22023';
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

  if not (select private.can_edit_listing_draft(p_listing_id)) then
    raise exception 'editable listing access required'
      using errcode = '42501';
  end if;

  if p_size_bytes <= 0 or p_size_bytes > 52428800 then
    raise exception 'file size is outside the allowed range'
      using errcode = '22023';
  end if;

  if p_media_type = 'virtual_tour' then
    raise exception 'virtual tour registration is not supported by this endpoint'
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

  object_path := format(
    'organizations/%s/listings/%s/%s/original.%s',
    target_listing.organization_id,
    target_listing.id,
    p_media_id,
    normalized_extension
  );

  -- The parent lock serializes duplicate requests. If a response was lost,
  -- return the exact same row instead of consuming another media position.
  select media.*
  into existing_media
  from public.listing_media as media
  where media.id = p_media_id;

  if found then
    if existing_media.listing_id <> target_listing.id
      or existing_media.organization_id <> target_listing.organization_id
      or existing_media.created_by <> current_user_id
      or existing_media.media_type <> p_media_type
      or existing_media.mime_type <> p_mime_type
      or existing_media.size_bytes <> p_size_bytes
      or existing_media.source_bucket <> 'listing-drafts'
      or existing_media.source_path <> object_path
    then
      raise exception 'media ID is already registered with different data'
        using errcode = '23505';
    end if;

    return existing_media;
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
    p_media_id,
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

revoke all on function public.register_listing_media(
  uuid, public.listing_media_type, text, bigint, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.register_listing_media(
  uuid, public.listing_media_type, text, bigint, text, uuid
) to authenticated;
