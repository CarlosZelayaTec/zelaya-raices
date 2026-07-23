-- Zelaya Raices: authenticated roles, controlled onboarding and atomic
-- listing moderation. Browser clients receive only narrowly scoped RPCs.

create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.account_status = 'active'
  );
$$;

revoke all on function private.is_active_user()
  from public, anon, authenticated, service_role;
grant execute on function private.is_active_user() to authenticated;

create or replace function private.is_org_member(
  target_organization_id uuid,
  allowed_roles public.organization_member_role[] default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_active_user())
    and exists (
      select 1
      from public.organization_members as member
      where member.organization_id = target_organization_id
        and member.profile_id = (select auth.uid())
        and member.status = 'active'
        and (
          allowed_roles is null
          or member.role = any (allowed_roles)
        )
    );
$$;

create or replace function private.can_manage_organization(
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      select private.is_staff(
        array[
          'super_admin'::public.staff_role,
          'admin'::public.staff_role
        ]
      )
    )
    or (
      select private.is_org_member(
        target_organization_id,
        array[
          'agency_owner'::public.organization_member_role,
          'manager'::public.organization_member_role,
          'property_owner'::public.organization_member_role
        ]
      )
    );
$$;

create or replace function private.can_view_listing(
  target_listing_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_staff())
    or (
      (select private.is_active_user())
      and exists (
        select 1
        from public.listings as listing
        join public.organization_members as member
          on member.organization_id = listing.organization_id
         and member.profile_id = (select auth.uid())
         and member.status = 'active'
        left join public.listing_managers as manager
          on manager.listing_id = listing.id
         and manager.profile_id = member.profile_id
        where listing.id = target_listing_id
          and (
            member.role in (
              'agency_owner',
              'manager',
              'property_owner',
              'viewer'
            )
            or (
              member.role in ('agent', 'editor')
              and manager.profile_id is not null
            )
          )
      )
    );
$$;

create or replace function private.can_manage_listing(
  target_listing_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      select private.is_staff(
        array[
          'super_admin'::public.staff_role,
          'admin'::public.staff_role
        ]
      )
    )
    or (
      (select private.is_active_user())
      and exists (
        select 1
        from public.listings as listing
        join public.organization_members as member
          on member.organization_id = listing.organization_id
         and member.profile_id = (select auth.uid())
         and member.status = 'active'
        left join public.listing_managers as manager
          on manager.listing_id = listing.id
         and manager.profile_id = member.profile_id
        where listing.id = target_listing_id
          and (
            member.role in (
              'agency_owner',
              'manager',
              'property_owner'
            )
            or (
              member.role in ('agent', 'editor')
              and manager.profile_id is not null
            )
          )
      )
    );
$$;

create or replace function private.can_edit_listing_draft(
  target_listing_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.can_manage_listing(target_listing_id))
    and exists (
      select 1
      from public.listings as listing
      join public.organizations as organization
        on organization.id = listing.organization_id
      where listing.id = target_listing_id
        and listing.publication_status in ('draft', 'rejected')
        and organization.status = 'active'
    );
$$;

create or replace function private.can_review_listing(
  target_listing_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_staff())
    or (select private.can_manage_listing(target_listing_id));
$$;

create or replace function private.is_listing_public(
  target_listing_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listings as listing
    join public.organizations as organization
      on organization.id = listing.organization_id
    where listing.id = target_listing_id
      and listing.publication_status = 'published'
      and listing.verification_status = 'verified'
      and organization.status = 'active'
  );
$$;

revoke all on function private.can_edit_listing_draft(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.can_review_listing(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.can_edit_listing_draft(uuid)
  to authenticated;
grant execute on function private.can_review_listing(uuid)
  to authenticated;

-- Public reads must honor organization suspension and listing verification.
drop policy if exists listings_select_published on public.listings;
create policy listings_select_published
on public.listings
for select
to anon, authenticated
using (
  (select private.is_listing_public(id))
  or (select private.can_view_listing(id))
);

-- Private coordinates and contact data are never exposed to organization
-- viewers or unassigned agents.
drop policy if exists listing_private_locations_select_managers
  on public.listing_private_locations;
create policy listing_private_locations_select_managers
on public.listing_private_locations
for select
to authenticated
using ((select private.can_review_listing(listing_id)));

drop policy if exists inquiries_select_participants on public.inquiries;
create policy inquiries_select_participants
on public.inquiries
for select
to authenticated
using (
  requester_id = (select auth.uid())
  or (select private.can_manage_listing(listing_id))
  or (select private.is_staff())
);

drop policy if exists reservations_select_participants
  on public.reservations;
create policy reservations_select_participants
on public.reservations
for select
to authenticated
using (
  customer_id = (select auth.uid())
  or (select private.can_manage_listing(listing_id))
  or (select private.is_staff())
);

drop policy if exists audit_logs_select_staff on public.audit_logs;
create policy audit_logs_select_admins
on public.audit_logs
for select
to authenticated
using (
  (
    select private.is_staff(
      array[
        'super_admin'::public.staff_role,
        'admin'::public.staff_role
      ]
    )
  )
);

-- Sensitive membership and workflow changes happen only through audited RPCs.
drop policy if exists organizations_insert_creator on public.organizations;
revoke insert on public.organizations from authenticated;

drop policy if exists organization_members_insert_managers
  on public.organization_members;
drop policy if exists organization_members_update_managers
  on public.organization_members;
drop policy if exists organization_members_delete_managers
  on public.organization_members;
revoke insert, update, delete on public.organization_members
  from authenticated;

drop policy if exists listings_insert_members on public.listings;
revoke insert on public.listings from authenticated;
revoke update (publication_status) on public.listings from authenticated;

drop policy if exists listing_managers_insert_org_managers
  on public.listing_managers;
drop policy if exists listing_managers_delete_org_managers
  on public.listing_managers;
revoke insert, delete on public.listing_managers from authenticated;

drop policy if exists listing_media_insert_managers on public.listing_media;
revoke insert on public.listing_media from authenticated;

drop policy if exists moderation_actions_insert_staff
  on public.moderation_actions;
revoke insert on public.moderation_actions from authenticated;

-- Once submitted, a listing and its supporting records become immutable to
-- organization members until moderation returns it to draft/rejected.
drop policy if exists listings_update_managers on public.listings;
create policy listings_update_managers
on public.listings
for update
to authenticated
using ((select private.can_edit_listing_draft(id)))
with check ((select private.can_edit_listing_draft(id)));

drop policy if exists listing_media_update_managers
  on public.listing_media;
drop policy if exists listing_media_delete_managers
  on public.listing_media;
create policy listing_media_update_managers
on public.listing_media
for update
to authenticated
using ((select private.can_edit_listing_draft(listing_id)))
with check ((select private.can_edit_listing_draft(listing_id)));
create policy listing_media_delete_managers
on public.listing_media
for delete
to authenticated
using ((select private.can_edit_listing_draft(listing_id)));

drop policy if exists listing_amenities_insert_managers
  on public.listing_amenities;
drop policy if exists listing_amenities_update_managers
  on public.listing_amenities;
drop policy if exists listing_amenities_delete_managers
  on public.listing_amenities;
create policy listing_amenities_insert_managers
on public.listing_amenities
for insert
to authenticated
with check ((select private.can_edit_listing_draft(listing_id)));
create policy listing_amenities_update_managers
on public.listing_amenities
for update
to authenticated
using ((select private.can_edit_listing_draft(listing_id)))
with check ((select private.can_edit_listing_draft(listing_id)));
create policy listing_amenities_delete_managers
on public.listing_amenities
for delete
to authenticated
using ((select private.can_edit_listing_draft(listing_id)));

drop policy if exists listing_locations_insert_managers
  on public.listing_locations;
drop policy if exists listing_locations_update_managers
  on public.listing_locations;
drop policy if exists listing_locations_delete_managers
  on public.listing_locations;
create policy listing_locations_insert_managers
on public.listing_locations
for insert
to authenticated
with check ((select private.can_edit_listing_draft(listing_id)));
create policy listing_locations_update_managers
on public.listing_locations
for update
to authenticated
using ((select private.can_edit_listing_draft(listing_id)))
with check ((select private.can_edit_listing_draft(listing_id)));
create policy listing_locations_delete_managers
on public.listing_locations
for delete
to authenticated
using ((select private.can_edit_listing_draft(listing_id)));

drop policy if exists listing_private_locations_insert_managers
  on public.listing_private_locations;
drop policy if exists listing_private_locations_update_managers
  on public.listing_private_locations;
drop policy if exists listing_private_locations_delete_managers
  on public.listing_private_locations;
create policy listing_private_locations_insert_managers
on public.listing_private_locations
for insert
to authenticated
with check ((select private.can_edit_listing_draft(listing_id)));
create policy listing_private_locations_update_managers
on public.listing_private_locations
for update
to authenticated
using ((select private.can_edit_listing_draft(listing_id)))
with check ((select private.can_edit_listing_draft(listing_id)));
create policy listing_private_locations_delete_managers
on public.listing_private_locations
for delete
to authenticated
using ((select private.can_edit_listing_draft(listing_id)));

-- Storage objects must have a matching metadata row and an editable draft.
create or replace function private.can_read_listing_draft_object(
  target_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listing_media as media
    where media.source_bucket = 'listing-drafts'
      and media.source_path = target_name
      and (select private.can_review_listing(media.listing_id))
  );
$$;

create or replace function private.can_write_listing_draft_object(
  target_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listing_media as media
    where media.source_bucket = 'listing-drafts'
      and media.source_path = target_name
      and (select private.can_edit_listing_draft(media.listing_id))
  );
$$;

revoke all on function private.can_read_listing_draft_object(text)
  from public, anon, authenticated, service_role;
revoke all on function private.can_write_listing_draft_object(text)
  from public, anon, authenticated, service_role;
grant execute on function private.can_read_listing_draft_object(text)
  to authenticated;
grant execute on function private.can_write_listing_draft_object(text)
  to authenticated;

drop policy if exists listing_drafts_select_managers on storage.objects;
drop policy if exists listing_drafts_insert_managers on storage.objects;
drop policy if exists listing_drafts_update_managers on storage.objects;
drop policy if exists listing_drafts_delete_managers on storage.objects;

create policy listing_drafts_select_registered
on storage.objects
for select
to authenticated
using (
  bucket_id = 'listing-drafts'
  and (select private.can_read_listing_draft_object(name))
);

create policy listing_drafts_insert_registered
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-drafts'
  and (select private.can_write_listing_draft_object(name))
);

create policy listing_drafts_delete_registered
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-drafts'
  and (select private.can_write_listing_draft_object(name))
);

-- A moderator may copy a registered draft object to the public bucket. The
-- moderation RPC verifies the copy before exposing the listing.
create policy listing_public_select_staff
on storage.objects
for select
to authenticated
using (
  bucket_id = 'listing-public'
  and (select private.is_staff())
);

create policy listing_public_insert_staff
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-public'
  and (select private.is_staff())
  and exists (
    select 1
    from public.listing_media as media
    where media.source_path = name
  )
);

create policy listing_public_delete_staff
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-public'
  and (select private.is_staff())
);

create or replace function public.create_organization(
  p_organization_type public.organization_type,
  p_name text,
  p_slug text,
  p_legal_name text default null,
  p_description text default null
)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  created_organization public.organizations;
begin
  if current_user_id is null
    or not (select private.is_active_user())
  then
    raise exception 'active authentication required'
      using errcode = '42501';
  end if;

  if p_organization_type not in (
    'agency'::public.organization_type,
    'individual_owner'::public.organization_type,
    'business'::public.organization_type
  ) then
    raise exception 'unsupported organization type'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  if p_organization_type = 'individual_owner'
    and exists (
      select 1
      from public.organizations as organization
      join public.organization_members as member
        on member.organization_id = organization.id
      where organization.organization_type = 'individual_owner'
        and organization.status <> 'archived'
        and member.profile_id = current_user_id
        and member.status = 'active'
    )
  then
    raise exception 'an individual owner account already exists'
      using errcode = '23505';
  end if;

  insert into public.organizations (
    organization_type,
    name,
    legal_name,
    slug,
    description,
    verification_status,
    status,
    created_by
  )
  values (
    p_organization_type,
    btrim(p_name),
    nullif(btrim(p_legal_name), ''),
    lower(btrim(p_slug)),
    nullif(btrim(p_description), ''),
    'unverified',
    'active',
    current_user_id
  )
  returning * into created_organization;

  return created_organization;
end;
$$;

create or replace function public.create_listing_draft(
  p_organization_id uuid,
  p_title text,
  p_slug text,
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
  created_listing public.listings;
begin
  if current_user_id is null
    or not (
      select private.is_org_member(
        p_organization_id,
        array[
          'agency_owner'::public.organization_member_role,
          'manager'::public.organization_member_role,
          'agent'::public.organization_member_role,
          'property_owner'::public.organization_member_role,
          'editor'::public.organization_member_role
        ]
      )
    )
  then
    raise exception 'organization membership required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organizations as organization
    where organization.id = p_organization_id
      and organization.status = 'active'
  ) then
    raise exception 'organization is not active'
      using errcode = '55000';
  end if;

  insert into public.listings (
    organization_id,
    created_by,
    title,
    slug,
    description,
    operation_type,
    property_type,
    publication_status,
    availability_status,
    price_amount,
    price_on_request,
    currency_code,
    price_period,
    bedrooms,
    bathrooms,
    parking_spaces,
    land_area,
    land_area_unit,
    construction_area,
    construction_area_unit,
    year_built
  )
  values (
    p_organization_id,
    current_user_id,
    btrim(p_title),
    lower(btrim(p_slug)),
    btrim(p_description),
    p_operation_type,
    p_property_type,
    'draft',
    'available',
    p_price_amount,
    p_price_on_request,
    p_currency_code,
    p_price_period,
    p_bedrooms,
    p_bathrooms,
    p_parking_spaces,
    p_land_area,
    p_land_area_unit,
    p_construction_area,
    p_construction_area_unit,
    p_year_built
  )
  returning * into created_listing;

  return created_listing;
end;
$$;

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
  next_sort_order smallint;
  should_be_primary boolean;
begin
  if current_user_id is null
    or not (select private.can_edit_listing_draft(p_listing_id))
  then
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

  select listing.*
  into target_listing
  from public.listings as listing
  where listing.id = p_listing_id
  for share;

  select
    coalesce(max(media.sort_order), -1) + 1,
    not exists (
      select 1
      from public.listing_media as primary_media
      where primary_media.listing_id = p_listing_id
        and primary_media.is_primary
    )
  into next_sort_order, should_be_primary
  from public.listing_media as media
  where media.listing_id = p_listing_id;

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

create or replace function public.submit_listing_for_review(
  p_listing_id uuid,
  p_expected_version bigint
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

  if not (select private.can_manage_listing(p_listing_id)) then
    raise exception 'listing management access required'
      using errcode = '42501';
  end if;

  if target_listing.publication_status not in ('draft', 'rejected') then
    raise exception 'listing is not editable'
      using errcode = '55000';
  end if;

  if target_listing.version <> p_expected_version then
    raise exception 'stale listing version'
      using errcode = '40001';
  end if;

  if not exists (
    select 1
    from public.listing_locations as location
    where location.listing_id = p_listing_id
  ) then
    raise exception 'public location is required'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.listing_media as media
    join storage.objects as object
      on object.bucket_id = media.source_bucket
     and object.name = media.source_path
    where media.listing_id = p_listing_id
      and media.media_type = 'image'
      and media.is_primary
      and media.processing_status not in ('rejected', 'failed')
  ) then
    raise exception 'an uploaded primary image is required'
      using errcode = '23514';
  end if;

  update public.listings
  set publication_status = 'pending_review'
  where id = p_listing_id
  returning * into target_listing;

  return target_listing;
end;
$$;

create or replace function public.moderate_listing(
  p_listing_id uuid,
  p_action public.moderation_action_type,
  p_expected_version bigint,
  p_public_reason text default null,
  p_internal_notes text default null
)
returns public.listings
language plpgsql
security definer
set search_path = ''
as $$
declare
  moderator_id uuid := (select auth.uid());
  target_listing public.listings;
  next_status public.publication_status;
begin
  if moderator_id is null or not (select private.is_staff()) then
    raise exception 'moderator access required'
      using errcode = '42501';
  end if;

  if p_action not in (
    'publish'::public.moderation_action_type,
    'reject'::public.moderation_action_type,
    'request_changes'::public.moderation_action_type
  ) then
    raise exception 'unsupported moderation action'
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

  if target_listing.publication_status <> 'pending_review' then
    raise exception 'listing is not pending review'
      using errcode = '55000';
  end if;

  if target_listing.version <> p_expected_version then
    raise exception 'stale listing version'
      using errcode = '40001';
  end if;

  if p_action in ('reject', 'request_changes')
    and nullif(btrim(p_public_reason), '') is null
  then
    raise exception 'public reason is required'
      using errcode = '23514';
  end if;

  if p_action = 'publish' then
    update public.listing_media as media
    set
      public_bucket = 'listing-public',
      public_path = media.source_path,
      processing_status = 'ready',
      updated_at = now()
    where media.listing_id = p_listing_id
      and exists (
        select 1
        from storage.objects as object
        where object.bucket_id = 'listing-public'
          and object.name = media.source_path
      );

    if not exists (
      select 1
      from public.listing_media as media
      where media.listing_id = p_listing_id
        and media.media_type = 'image'
        and media.is_primary
        and media.processing_status = 'ready'
        and media.public_bucket = 'listing-public'
        and media.public_path is not null
    ) then
      raise exception 'approved public primary media is required'
        using errcode = '23514';
    end if;

    next_status := 'published';
  elsif p_action = 'request_changes' then
    next_status := 'draft';
  else
    next_status := 'rejected';
  end if;

  update public.listings
  set
    publication_status = next_status,
    verification_status = case
      when next_status = 'published'
        then 'verified'::public.verification_status
      else 'unverified'::public.verification_status
    end,
    verified_at = case
      when next_status = 'published' then now()
      else null
    end,
    verified_by = case
      when next_status = 'published' then moderator_id
      else null
    end
  where id = p_listing_id
  returning * into target_listing;

  insert into public.moderation_actions (
    moderator_id,
    listing_id,
    action,
    previous_state,
    new_state,
    public_reason,
    internal_notes
  )
  values (
    moderator_id,
    p_listing_id,
    p_action,
    'pending_review',
    next_status::text,
    nullif(btrim(p_public_reason), ''),
    nullif(btrim(p_internal_notes), '')
  );

  return target_listing;
end;
$$;

create or replace function public.get_agent_dashboard(
  p_organization_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  member_role public.organization_member_role;
  sees_all_listings boolean;
  result jsonb;
begin
  if current_user_id is null
    or not (select private.is_active_user())
  then
    raise exception 'active authentication required'
      using errcode = '42501';
  end if;

  select member.role
  into member_role
  from public.organization_members as member
  where member.organization_id = p_organization_id
    and member.profile_id = current_user_id
    and member.status = 'active';

  if not found or member_role = 'viewer' then
    raise exception 'dashboard access denied'
      using errcode = '42501';
  end if;

  sees_all_listings := member_role in (
    'agency_owner',
    'manager',
    'property_owner'
  );

  with scoped_listings as materialized (
    select listing.*
    from public.listings as listing
    where listing.organization_id = p_organization_id
      and (
        sees_all_listings
        or exists (
          select 1
          from public.listing_managers as manager
          where manager.listing_id = listing.id
            and manager.profile_id = current_user_id
        )
      )
  ),
  listing_totals as (
    select
      count(*) as total,
      count(*) filter (
        where publication_status = 'draft'
      ) as drafts,
      count(*) filter (
        where publication_status = 'pending_review'
      ) as pending_review,
      count(*) filter (
        where publication_status = 'published'
      ) as published,
      count(*) filter (
        where availability_status = 'available'
      ) as available,
      coalesce(sum(view_count), 0) as views
    from scoped_listings
  ),
  inquiry_totals as (
    select
      count(*) as total,
      count(*) filter (
        where inquiry.status in ('new', 'assigned')
      ) as open
    from public.inquiries as inquiry
    join scoped_listings as listing
      on listing.id = inquiry.listing_id
  )
  select jsonb_build_object(
    'organization_id', p_organization_id,
    'listings', jsonb_build_object(
      'total', listing_totals.total,
      'drafts', listing_totals.drafts,
      'pending_review', listing_totals.pending_review,
      'published', listing_totals.published,
      'available', listing_totals.available,
      'views', listing_totals.views
    ),
    'inquiries', jsonb_build_object(
      'total', inquiry_totals.total,
      'open', inquiry_totals.open
    ),
    'recent_listings', coalesce(
      (
        select jsonb_agg(
          to_jsonb(recent)
          order by recent.updated_at desc
        )
        from (
          select
            id,
            title,
            publication_status,
            availability_status,
            view_count,
            updated_at
          from scoped_listings
          order by updated_at desc, id
          limit 10
        ) as recent
      ),
      '[]'::jsonb
    )
  )
  into result
  from listing_totals
  cross join inquiry_totals;

  return result;
end;
$$;

-- A one-time, high-entropy code safely bootstraps the empty project's first
-- super administrator. Only its SHA-256 digest is stored in the database.
create table private.platform_bootstrap (
  singleton boolean primary key default true check (singleton),
  code_hash bytea not null,
  claimed_by uuid references public.profiles(id) on delete restrict,
  claimed_at timestamptz,
  constraint platform_bootstrap_claim_check
    check (
      (claimed_by is null and claimed_at is null)
      or (claimed_by is not null and claimed_at is not null)
    )
);

revoke all on private.platform_bootstrap
  from public, anon, authenticated, service_role;

insert into private.platform_bootstrap (singleton, code_hash)
values (
  true,
  decode(
    'dd0875cc212ed6491d33965301af63807e5b69c5c9175503e10f7810fcaed1d0',
    'hex'
  )
);

create or replace function public.claim_initial_super_admin(
  p_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  bootstrap_record private.platform_bootstrap;
begin
  if current_user_id is null
    or not (select private.is_active_user())
  then
    raise exception 'active authentication required'
      using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(967352410);

  if exists (
    select 1
    from public.profiles as profile
    where profile.staff_role is not null
  ) then
    raise exception 'platform administration is already initialized'
      using errcode = '55000';
  end if;

  select bootstrap.*
  into bootstrap_record
  from private.platform_bootstrap as bootstrap
  where bootstrap.singleton
  for update;

  if p_code is null
    or char_length(p_code) > 200
    or bootstrap_record.claimed_at is not null
    or bootstrap_record.code_hash is distinct from
      extensions.digest(p_code, 'sha256')
  then
    raise exception 'invalid or expired activation code'
      using errcode = '42501';
  end if;

  update public.profiles
  set
    staff_role = 'super_admin',
    account_status = 'active',
    updated_at = now()
  where id = current_user_id;

  update private.platform_bootstrap
  set
    claimed_by = current_user_id,
    claimed_at = now()
  where singleton;

  insert into public.audit_logs (
    actor_id,
    entity_table,
    entity_id,
    operation,
    after_data
  )
  values (
    current_user_id,
    'profiles',
    current_user_id,
    'UPDATE',
    jsonb_build_object('staff_role', 'super_admin')
  );

  return true;
end;
$$;

create or replace function public.set_platform_staff_role(
  p_profile_id uuid,
  p_staff_role public.staff_role
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  previous_role public.staff_role;
  updated_profile public.profiles;
begin
  if current_user_id is null
    or not (
      select private.is_staff(
        array['super_admin'::public.staff_role]
      )
    )
  then
    raise exception 'super administrator access required'
      using errcode = '42501';
  end if;

  select profile.staff_role
  into previous_role
  from public.profiles as profile
  where profile.id = p_profile_id
  for update;

  if not found then
    raise exception 'profile not found'
      using errcode = 'P0002';
  end if;

  if previous_role = 'super_admin'
    and p_staff_role is distinct from 'super_admin'::public.staff_role
    and (
      select count(*)
      from public.profiles as profile
      where profile.staff_role = 'super_admin'
        and profile.account_status = 'active'
    ) <= 1
  then
    raise exception 'the last super administrator cannot be demoted'
      using errcode = '23514';
  end if;

  update public.profiles
  set
    staff_role = p_staff_role,
    updated_at = now()
  where id = p_profile_id
  returning * into updated_profile;

  insert into public.audit_logs (
    actor_id,
    entity_table,
    entity_id,
    operation,
    before_data,
    after_data
  )
  values (
    current_user_id,
    'profiles',
    p_profile_id,
    'UPDATE',
    jsonb_build_object('staff_role', previous_role),
    jsonb_build_object('staff_role', p_staff_role)
  );

  return updated_profile;
end;
$$;

revoke all on function public.create_organization(
  public.organization_type, text, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.create_listing_draft(
  uuid, text, text, text, public.operation_type,
  public.property_type, numeric, boolean, public.currency_code,
  public.price_period, smallint, numeric, smallint, numeric,
  public.area_unit, numeric, public.area_unit, smallint
) from public, anon, authenticated, service_role;
revoke all on function public.register_listing_media(
  uuid, public.listing_media_type, text, bigint, text
) from public, anon, authenticated, service_role;
revoke all on function public.submit_listing_for_review(uuid, bigint)
  from public, anon, authenticated, service_role;
revoke all on function public.moderate_listing(
  uuid, public.moderation_action_type, bigint, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.get_agent_dashboard(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.claim_initial_super_admin(text)
  from public, anon, authenticated, service_role;
revoke all on function public.set_platform_staff_role(
  uuid, public.staff_role
) from public, anon, authenticated, service_role;

grant execute on function public.create_organization(
  public.organization_type, text, text, text, text
) to authenticated;
grant execute on function public.create_listing_draft(
  uuid, text, text, text, public.operation_type,
  public.property_type, numeric, boolean, public.currency_code,
  public.price_period, smallint, numeric, smallint, numeric,
  public.area_unit, numeric, public.area_unit, smallint
) to authenticated;
grant execute on function public.register_listing_media(
  uuid, public.listing_media_type, text, bigint, text
) to authenticated;
grant execute on function public.submit_listing_for_review(uuid, bigint)
  to authenticated;
grant execute on function public.moderate_listing(
  uuid, public.moderation_action_type, bigint, text, text
) to authenticated;
grant execute on function public.get_agent_dashboard(uuid)
  to authenticated;
grant execute on function public.claim_initial_super_admin(text)
  to authenticated;
grant execute on function public.set_platform_staff_role(
  uuid, public.staff_role
) to authenticated;

-- Invalid request IDs should never abort a business write.
create or replace function private.write_redacted_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_payload jsonb;
  new_payload jsonb;
  target_id uuid;
  target_organization_id uuid;
begin
  if tg_table_name = 'listings' then
    old_payload := case when tg_op = 'INSERT' then null else jsonb_build_object(
      'organization_id', old.organization_id,
      'title', old.title,
      'publication_status', old.publication_status,
      'availability_status', old.availability_status,
      'price_amount', old.price_amount,
      'currency_code', old.currency_code,
      'price_period', old.price_period,
      'verification_status', old.verification_status
    ) end;
    new_payload := case when tg_op = 'DELETE' then null else jsonb_build_object(
      'organization_id', new.organization_id,
      'title', new.title,
      'publication_status', new.publication_status,
      'availability_status', new.availability_status,
      'price_amount', new.price_amount,
      'currency_code', new.currency_code,
      'price_period', new.price_period,
      'verification_status', new.verification_status
    ) end;
    target_id := coalesce(new.id, old.id);
    target_organization_id := coalesce(
      new.organization_id,
      old.organization_id
    );
  elsif tg_table_name = 'organization_members' then
    old_payload := case when tg_op = 'INSERT' then null else jsonb_build_object(
      'profile_id', old.profile_id,
      'role', old.role,
      'status', old.status
    ) end;
    new_payload := case when tg_op = 'DELETE' then null else jsonb_build_object(
      'profile_id', new.profile_id,
      'role', new.role,
      'status', new.status
    ) end;
    target_id := coalesce(new.profile_id, old.profile_id);
    target_organization_id := coalesce(
      new.organization_id,
      old.organization_id
    );
  elsif tg_table_name = 'subscriptions' then
    old_payload := case when tg_op = 'INSERT' then null else jsonb_build_object(
      'plan_code', old.plan_code,
      'status', old.status,
      'price_amount', old.price_amount,
      'currency_code', old.currency_code,
      'current_period_start', old.current_period_start,
      'current_period_end', old.current_period_end
    ) end;
    new_payload := case when tg_op = 'DELETE' then null else jsonb_build_object(
      'plan_code', new.plan_code,
      'status', new.status,
      'price_amount', new.price_amount,
      'currency_code', new.currency_code,
      'current_period_start', new.current_period_start,
      'current_period_end', new.current_period_end
    ) end;
    target_id := coalesce(new.id, old.id);
    target_organization_id := coalesce(
      new.organization_id,
      old.organization_id
    );
  elsif tg_table_name = 'reservations' then
    old_payload := case when tg_op = 'INSERT' then null else jsonb_build_object(
      'listing_id', old.listing_id,
      'customer_id', old.customer_id,
      'status', old.status,
      'starts_at', old.starts_at,
      'ends_at', old.ends_at,
      'total_amount', old.total_amount,
      'currency_code', old.currency_code
    ) end;
    new_payload := case when tg_op = 'DELETE' then null else jsonb_build_object(
      'listing_id', new.listing_id,
      'customer_id', new.customer_id,
      'status', new.status,
      'starts_at', new.starts_at,
      'ends_at', new.ends_at,
      'total_amount', new.total_amount,
      'currency_code', new.currency_code
    ) end;
    target_id := coalesce(new.id, old.id);
    target_organization_id := coalesce(
      new.organization_id,
      old.organization_id
    );
  else
    return coalesce(new, old);
  end if;

  if old_payload is distinct from new_payload then
    insert into public.audit_logs (
      actor_id,
      organization_id,
      entity_table,
      entity_id,
      operation,
      before_data,
      after_data,
      request_id
    )
    values (
      (select auth.uid()),
      target_organization_id,
      tg_table_name,
      target_id,
      tg_op,
      old_payload,
      new_payload,
      private.try_uuid(
        nullif(
          coalesce(
            nullif(current_setting('request.headers', true), ''),
            '{}'
          )::jsonb
            ->> 'x-request-id',
          ''
        )
      )
    );
  end if;

  return coalesce(new, old);
end;
$$;
