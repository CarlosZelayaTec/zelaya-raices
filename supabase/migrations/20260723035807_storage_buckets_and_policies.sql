-- Zelaya Raices: Storage buckets and object-level access policies.
-- Agents upload drafts only. Approved derivatives are published by trusted
-- server-side code into the public bucket.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'listing-drafts',
    'listing-drafts',
    false,
    52428800,
    array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'application/pdf'
    ]
  ),
  (
    'listing-public',
    'listing-public',
    true,
    52428800,
    array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'application/pdf'
    ]
  ),
  (
    'avatars-public',
    'avatars-public',
    true,
    5242880,
    array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif'
    ]
  ),
  (
    'verification-documents',
    'verification-documents',
    false,
    10485760,
    array[
      'image/jpeg',
      'image/png',
      'application/pdf'
    ]
  )
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.try_uuid(value text)
returns uuid
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  return value::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

revoke execute on function private.try_uuid(text)
  from public, anon, authenticated, service_role;
grant execute on function private.try_uuid(text) to authenticated;

create policy listing_drafts_select_managers
on storage.objects
for select
to authenticated
using (
  bucket_id = 'listing-drafts'
  and (storage.foldername(name))[1] = 'organizations'
  and (storage.foldername(name))[3] = 'listings'
  and exists (
    select 1
    from public.listings as listing
    where listing.id = private.try_uuid((storage.foldername(name))[4])
      and listing.organization_id =
        private.try_uuid((storage.foldername(name))[2])
      and private.can_manage_listing(listing.id)
  )
);

create policy listing_drafts_insert_managers
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-drafts'
  and (storage.foldername(name))[1] = 'organizations'
  and (storage.foldername(name))[3] = 'listings'
  and exists (
    select 1
    from public.listings as listing
    where listing.id = private.try_uuid((storage.foldername(name))[4])
      and listing.organization_id =
        private.try_uuid((storage.foldername(name))[2])
      and private.can_manage_listing(listing.id)
  )
);

create policy listing_drafts_update_managers
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-drafts'
  and (storage.foldername(name))[1] = 'organizations'
  and (storage.foldername(name))[3] = 'listings'
  and exists (
    select 1
    from public.listings as listing
    where listing.id = private.try_uuid((storage.foldername(name))[4])
      and listing.organization_id =
        private.try_uuid((storage.foldername(name))[2])
      and private.can_manage_listing(listing.id)
  )
)
with check (
  bucket_id = 'listing-drafts'
  and (storage.foldername(name))[1] = 'organizations'
  and (storage.foldername(name))[3] = 'listings'
  and exists (
    select 1
    from public.listings as listing
    where listing.id = private.try_uuid((storage.foldername(name))[4])
      and listing.organization_id =
        private.try_uuid((storage.foldername(name))[2])
      and private.can_manage_listing(listing.id)
  )
);

create policy listing_drafts_delete_managers
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-drafts'
  and (storage.foldername(name))[1] = 'organizations'
  and (storage.foldername(name))[3] = 'listings'
  and exists (
    select 1
    from public.listings as listing
    where listing.id = private.try_uuid((storage.foldername(name))[4])
      and listing.organization_id =
        private.try_uuid((storage.foldername(name))[2])
      and private.can_manage_listing(listing.id)
  )
);

create policy avatars_select_own_for_upsert
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars-public'
  and (storage.foldername(name))[1] = 'users'
  and private.try_uuid((storage.foldername(name))[2]) = (select auth.uid())
);

create policy avatars_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars-public'
  and (storage.foldername(name))[1] = 'users'
  and private.try_uuid((storage.foldername(name))[2]) = (select auth.uid())
);

create policy avatars_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars-public'
  and (storage.foldername(name))[1] = 'users'
  and private.try_uuid((storage.foldername(name))[2]) = (select auth.uid())
)
with check (
  bucket_id = 'avatars-public'
  and (storage.foldername(name))[1] = 'users'
  and private.try_uuid((storage.foldername(name))[2]) = (select auth.uid())
);

create policy avatars_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars-public'
  and (storage.foldername(name))[1] = 'users'
  and private.try_uuid((storage.foldername(name))[2]) = (select auth.uid())
);
