-- Keep contact details available while a verified listing is publicly visible.
-- Existing profiles are intentionally not backfilled from auth.users.

create or replace function private.enforce_published_seller_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.listings as listing
    where listing.contact_profile_id = old.id
      and listing.publication_status = 'published'::public.publication_status
      and listing.verification_status = 'verified'::public.verification_status
  ) then
    return new;
  end if;

  if old.public_email is not null
    and (
      new.public_email is null
      or char_length(btrim(new.public_email)) > 320
      or btrim(new.public_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  then
    raise exception
      'a seller with a published verified listing cannot clear or invalidate the public email'
      using errcode = '23514';
  end if;

  if old.public_phone is not null
    and (
      new.public_phone is null
      or new.public_phone !~ '^\+[1-9][0-9]{7,14}$'
    )
  then
    raise exception
      'a seller with a published verified listing cannot clear or invalidate the public phone'
      using errcode = '23514';
  end if;

  if old.public_whatsapp is not null
    and (
      new.public_whatsapp is null
      or new.public_whatsapp !~ '^\+[1-9][0-9]{7,14}$'
    )
  then
    raise exception
      'a seller with a published verified listing cannot clear or invalidate the public WhatsApp number'
      using errcode = '23514';
  end if;

  if old.account_status = 'active'::public.account_status
    and new.account_status <> 'active'::public.account_status
  then
    raise exception
      'a seller with a published verified listing cannot be deactivated until that listing is no longer public'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_published_seller_contact on public.profiles;

create trigger profiles_enforce_published_seller_contact
before update of public_email, public_phone, public_whatsapp, account_status
on public.profiles
for each row
execute function private.enforce_published_seller_contact();

revoke all on function private.enforce_published_seller_contact()
  from public, anon, authenticated, service_role;
