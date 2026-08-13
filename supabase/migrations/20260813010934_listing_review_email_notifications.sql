-- Keep review-email delivery idempotent and private. Only the Edge Function's
-- service role can reserve, retry, or complete a notification.
create table public.listing_review_notifications (
  id bigint generated always as identity primary key,
  listing_id uuid not null
    references public.listings(id) on delete cascade,
  listing_version bigint not null,
  status text not null default 'sending',
  attempt_count smallint not null default 1,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listing_review_notifications_listing_version_check
    check (listing_version > 0),
  constraint listing_review_notifications_status_check
    check (status in ('sending', 'sent', 'failed')),
  constraint listing_review_notifications_attempt_count_check
    check (attempt_count between 1 and 10),
  constraint listing_review_notifications_last_error_length_check
    check (last_error is null or char_length(last_error) <= 1000),
  constraint listing_review_notifications_listing_version_key
    unique (listing_id, listing_version)
);

alter table public.listing_review_notifications enable row level security;

revoke all on table public.listing_review_notifications
  from public, anon, authenticated, service_role;
revoke all on sequence public.listing_review_notifications_id_seq
  from public, anon, authenticated, service_role;

grant select, insert, update on table public.listing_review_notifications
  to service_role;
grant usage, select on sequence public.listing_review_notifications_id_seq
  to service_role;

-- New accounts keep the contact details supplied during registration. These
-- values are contact data only and are never used for authorization.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
  requested_phone text;
  requested_whatsapp text;
begin
  requested_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, new.id::text), '@', 1)
  );

  if char_length(requested_name) < 2 then
    requested_name := requested_name || '_';
  end if;

  requested_phone := nullif(
    btrim(new.raw_user_meta_data ->> 'public_phone'),
    ''
  );
  requested_whatsapp := nullif(
    btrim(new.raw_user_meta_data ->> 'public_whatsapp'),
    ''
  );

  insert into public.profiles (
    id,
    display_name,
    public_email,
    public_phone,
    public_whatsapp
  )
  values (
    new.id,
    left(requested_name, 120),
    case
      when new.email is not null
        and btrim(new.email) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        then lower(btrim(new.email))
      else null
    end,
    case
      when requested_phone ~ '^\+[1-9][0-9]{7,14}$'
        then requested_phone
      else null
    end,
    case
      when requested_whatsapp ~ '^\+[1-9][0-9]{7,14}$'
        then requested_whatsapp
      else null
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- A seller's direct telephone number remains private. Public property pages
-- expose only email and WhatsApp contact channels.
drop function if exists public.get_public_listing_contact(uuid);

create function public.get_public_listing_contact(
  p_listing_id uuid
)
returns table (
  seller_name text,
  seller_bio text,
  seller_email text,
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
    profile.public_whatsapp,
    profile.verification_status = 'verified'::public.verification_status
  from public.listings as listing
  join public.profiles as profile
    on profile.id = listing.contact_profile_id
  where listing.id = p_listing_id
    and profile.account_status = 'active'
    and (select private.is_listing_public(listing.id));
$$;

revoke all on function public.get_public_listing_contact(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_public_listing_contact(uuid)
  to anon, authenticated;

revoke select on public.profiles from anon;
grant select (
  id,
  display_name,
  slug,
  avatar_path,
  bio,
  public_whatsapp,
  verification_status,
  verified_at,
  created_at,
  updated_at
) on public.profiles to anon;
