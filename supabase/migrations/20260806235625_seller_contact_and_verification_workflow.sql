
-- Contact ownership and verification workflow for public listings.

alter table public.profiles
  add column public_email text;

alter table public.listings
  add column contact_profile_id uuid;

update public.listings
set contact_profile_id = created_by
where contact_profile_id is null;

alter table public.listings
  alter column contact_profile_id set not null;

alter table public.listings
  add constraint listings_contact_profile_id_fkey
  foreign key (contact_profile_id)
  references public.profiles(id)
  on delete restrict;

create index listings_contact_profile_idx
  on public.listings (contact_profile_id);

-- A listing always starts with the creator as its contact. Only staff can
-- later change that assignment through a separately reviewed workflow.
create or replace function private.prepare_listing_contact_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.contact_profile_id is null then
    new.contact_profile_id := new.created_by;
  end if;

  if (select auth.uid()) is not null
    and not (select private.is_staff())
    and (
      (tg_op = 'INSERT' and new.contact_profile_id <> (select auth.uid()))
      or (
        tg_op = 'UPDATE'
        and new.contact_profile_id is distinct from old.contact_profile_id
      )
    )
  then
    raise exception 'listing contact cannot be reassigned by this user'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger aaa_listings_prepare_contact_profile
before insert or update on public.listings
for each row execute function private.prepare_listing_contact_profile();

-- A draft may be saved without contact information, but it cannot enter the
-- review/publication workflow until its assigned seller has usable details.
create or replace function private.enforce_listing_contact_details()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.publication_status = 'pending_review'
    and old.publication_status <> 'pending_review'
  then
    if not exists (
      select 1
      from public.profiles as profile
      where profile.id = new.contact_profile_id
        and profile.account_status = 'active'
        and profile.public_email is not null
        and btrim(profile.public_email) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        and profile.public_phone ~ '^\+[1-9][0-9]{7,14}$'
        and profile.public_whatsapp ~ '^\+[1-9][0-9]{7,14}$'
    ) then
      raise exception
        'add a valid public email, phone and WhatsApp number to the seller profile before requesting publication'
        using errcode = '23514';
    end if;

    if not exists (
      select 1
      from public.listing_managers as manager
      join public.organization_members as member
        on member.organization_id = manager.organization_id
       and member.profile_id = manager.profile_id
       and member.status = 'active'
      where manager.listing_id = new.id
        and manager.organization_id = new.organization_id
        and manager.profile_id = new.contact_profile_id
    ) then
      raise exception 'the seller contact must actively manage this listing'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger aab_listings_enforce_contact_details
before update on public.listings
for each row execute function private.enforce_listing_contact_details();

-- The public endpoint exposes only the seller data required on a property
-- page, and only when that property itself is already public.
create or replace function public.get_public_listing_contact(
  p_listing_id uuid
)
returns table (
  seller_name text,
  seller_bio text,
  seller_email text,
  seller_phone text,
  seller_whatsapp text,
  seller_verified boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.display_name,
    profile.bio,
    profile.public_email,
    profile.public_phone,
    profile.public_whatsapp,
    profile.verification_status = 'verified'::public.verification_status
  from public.listings as listing
  join public.profiles as profile
    on profile.id = listing.contact_profile_id
  where listing.id = p_listing_id
    and profile.account_status = 'active'
    and (select private.is_listing_public(listing.id));
$$;

-- Super administrators validate agents/advertisers through an audited RPC;
-- verification columns remain unavailable for direct browser updates.
create or replace function public.moderate_verification(
  p_target_type text,
  p_target_id uuid,
  p_action public.moderation_action_type
)
returns public.verification_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  previous_status public.verification_status;
  next_status public.verification_status;
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

  if p_target_type not in ('profile', 'organization')
    or p_action not in (
      'verify'::public.moderation_action_type,
      'reject'::public.moderation_action_type,
      'unverify'::public.moderation_action_type
    )
  then
    raise exception 'invalid verification moderation request'
      using errcode = '22023';
  end if;

  next_status := case p_action
    when 'verify'::public.moderation_action_type
      then 'verified'::public.verification_status
    when 'reject'::public.moderation_action_type
      then 'rejected'::public.verification_status
    else 'unverified'::public.verification_status
  end;

  if p_target_type = 'profile' then
    select profile.verification_status
    into previous_status
    from public.profiles as profile
    where profile.id = p_target_id
    for update;

    if not found then
      raise exception 'profile not found'
        using errcode = 'P0002';
    end if;

    update public.profiles
    set
      verification_status = next_status,
      verified_at = case when next_status = 'verified'::public.verification_status then now() else null end,
      verified_by = case when next_status = 'verified'::public.verification_status then current_user_id else null end
    where id = p_target_id;

    insert into public.moderation_actions (
      moderator_id,
      profile_id,
      action,
      previous_state,
      new_state,
      metadata
    )
    values (
      current_user_id,
      p_target_id,
      p_action,
      previous_status::text,
      next_status::text,
      jsonb_build_object('target_type', 'profile')
    );

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
      p_target_id,
      'UPDATE',
      jsonb_build_object('verification_status', previous_status),
      jsonb_build_object('verification_status', next_status)
    );
  else
    select organization.verification_status
    into previous_status
    from public.organizations as organization
    where organization.id = p_target_id
    for update;

    if not found then
      raise exception 'organization not found'
        using errcode = 'P0002';
    end if;

    update public.organizations
    set
      verification_status = next_status,
      verified_at = case when next_status = 'verified'::public.verification_status then now() else null end,
      verified_by = case when next_status = 'verified'::public.verification_status then current_user_id else null end
    where id = p_target_id;

    insert into public.moderation_actions (
      moderator_id,
      organization_id,
      action,
      previous_state,
      new_state,
      metadata
    )
    values (
      current_user_id,
      p_target_id,
      p_action,
      previous_status::text,
      next_status::text,
      jsonb_build_object('target_type', 'organization')
    );

    insert into public.audit_logs (
      actor_id,
      organization_id,
      entity_table,
      entity_id,
      operation,
      before_data,
      after_data
    )
    values (
      current_user_id,
      p_target_id,
      'organizations',
      p_target_id,
      'UPDATE',
      jsonb_build_object('verification_status', previous_status),
      jsonb_build_object('verification_status', next_status)
    );
  end if;

  return next_status;
end;
$$;

revoke all on function public.get_public_listing_contact(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_public_listing_contact(uuid)
  to anon, authenticated;

revoke all on function public.moderate_verification(
  text, uuid, public.moderation_action_type
) from public, anon, authenticated, service_role;
grant execute on function public.moderate_verification(
  text, uuid, public.moderation_action_type
) to authenticated;

grant update (public_email) on public.profiles to authenticated;
