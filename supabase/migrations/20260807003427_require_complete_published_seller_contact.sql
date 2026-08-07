-- A published, verified listing must always retain a complete seller contact.
-- Existing profiles are intentionally not backfilled from auth.users.

create or replace function private.enforce_published_seller_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.listings as listing
    where listing.contact_profile_id = old.id
      and listing.publication_status = 'published'::public.publication_status
      and listing.verification_status = 'verified'::public.verification_status
  )
    and (
      new.account_status <> 'active'::public.account_status
      or new.public_email is null
      or char_length(btrim(new.public_email)) > 320
      or btrim(new.public_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or new.public_phone is null
      or new.public_phone !~ '^\+[1-9][0-9]{7,14}$'
      or new.public_whatsapp is null
      or new.public_whatsapp !~ '^\+[1-9][0-9]{7,14}$'
    )
  then
    raise exception
      'a seller with a published verified listing must keep an active account and valid public email, phone and WhatsApp number'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_published_seller_contact on public.profiles;

create trigger profiles_enforce_published_seller_contact
before update
on public.profiles
for each row
execute function private.enforce_published_seller_contact();

revoke all on function private.enforce_published_seller_contact()
  from public, anon, authenticated, service_role;
