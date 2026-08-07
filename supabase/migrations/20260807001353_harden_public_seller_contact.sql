-- Tighten public seller contact exposure and validate contact data at the
-- database boundary as well as in the profile form.

alter table public.profiles
  add constraint profiles_public_email_format_check
  check (
    public_email is null
    or (
      char_length(btrim(public_email)) <= 320
      and btrim(public_email) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  ) not valid;

alter table public.profiles
  add constraint profiles_public_phone_format_check
  check (
    public_phone is null
    or public_phone ~ '^\+[1-9][0-9]{7,14}$'
  ) not valid;

alter table public.profiles
  add constraint profiles_public_whatsapp_format_check
  check (
    public_whatsapp is null
    or public_whatsapp ~ '^\+[1-9][0-9]{7,14}$'
  ) not valid;

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
    and listing.verification_status = 'verified'::public.verification_status
    and profile.account_status = 'active'
    and (select private.is_listing_public(listing.id));
$$;
