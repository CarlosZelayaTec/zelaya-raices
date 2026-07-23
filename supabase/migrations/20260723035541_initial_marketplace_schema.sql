-- Zelaya Raices: identity, tenancy and property domain.
-- Public API grants are explicit and always paired with RLS policies.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;

create extension if not exists postgis with schema extensions;
create extension if not exists btree_gist with schema extensions;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables
  from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences
  from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions
  from public, anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;

create type public.staff_role as enum (
  'super_admin',
  'admin',
  'moderator'
);

create type public.account_status as enum (
  'active',
  'suspended',
  'disabled'
);

create type public.verification_status as enum (
  'unverified',
  'pending',
  'verified',
  'rejected'
);

create type public.organization_type as enum (
  'agency',
  'individual_owner',
  'business'
);

create type public.organization_status as enum (
  'active',
  'suspended',
  'archived'
);

create type public.organization_member_role as enum (
  'agency_owner',
  'manager',
  'agent',
  'property_owner',
  'editor',
  'viewer'
);

create type public.organization_member_status as enum (
  'invited',
  'active',
  'suspended',
  'removed'
);

create type public.operation_type as enum (
  'sale',
  'rent',
  'short_term_rent'
);

create type public.property_type as enum (
  'house',
  'apartment',
  'condominium',
  'land',
  'commercial',
  'office',
  'warehouse',
  'farm',
  'building'
);

create type public.publication_status as enum (
  'draft',
  'pending_review',
  'published',
  'rejected',
  'archived'
);

create type public.availability_status as enum (
  'available',
  'reserved',
  'sold',
  'rented',
  'unavailable'
);

create type public.currency_code as enum (
  'HNL',
  'USD'
);

create type public.price_period as enum (
  'total',
  'monthly',
  'yearly',
  'weekly',
  'nightly',
  'daily'
);

create type public.area_unit as enum (
  'm2',
  'vara2',
  'manzana',
  'sqft',
  'acre'
);

create type public.listing_media_type as enum (
  'image',
  'video',
  'floor_plan',
  'virtual_tour'
);

create type public.media_processing_status as enum (
  'pending',
  'processing',
  'ready',
  'rejected',
  'failed'
);

create type public.location_precision as enum (
  'zone',
  'approximate',
  'exact'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  staff_role public.staff_role,
  account_status public.account_status not null default 'active',
  display_name text not null,
  slug text,
  avatar_path text,
  bio text,
  public_phone text,
  public_whatsapp text,
  verification_status public.verification_status not null default 'unverified',
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length_check
    check (char_length(display_name) between 2 and 120),
  constraint profiles_slug_format_check
    check (
      slug is null
      or (
        char_length(slug) between 3 and 100
        and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      )
    ),
  constraint profiles_bio_length_check
    check (bio is null or char_length(bio) <= 2000),
  constraint profiles_verification_timestamp_check
    check (
      (verification_status = 'verified' and verified_at is not null)
      or (verification_status <> 'verified' and verified_at is null)
    )
);

create unique index profiles_slug_unique_idx
  on public.profiles (slug)
  where slug is not null;
create index profiles_staff_role_idx
  on public.profiles (staff_role)
  where staff_role is not null and account_status = 'active';
create index profiles_verified_by_idx
  on public.profiles (verified_by)
  where verified_by is not null;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  organization_type public.organization_type not null,
  name text not null,
  legal_name text,
  slug text not null unique,
  description text,
  logo_path text,
  website_url text,
  public_email text,
  public_phone text,
  verification_status public.verification_status not null default 'unverified',
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  status public.organization_status not null default 'active',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_length_check
    check (char_length(name) between 2 and 160),
  constraint organizations_slug_format_check
    check (
      char_length(slug) between 3 and 100
      and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
  constraint organizations_description_length_check
    check (description is null or char_length(description) <= 4000),
  constraint organizations_verification_timestamp_check
    check (
      (verification_status = 'verified' and verified_at is not null)
      or (verification_status <> 'verified' and verified_at is null)
    )
);

create index organizations_created_by_idx
  on public.organizations (created_by);
create index organizations_verified_by_idx
  on public.organizations (verified_by)
  where verified_by is not null;
create index organizations_public_directory_idx
  on public.organizations (organization_type, name)
  where status = 'active' and verification_status = 'verified';

create table public.organization_members (
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  profile_id uuid not null
    references public.profiles(id) on delete cascade,
  role public.organization_member_role not null,
  status public.organization_member_status not null default 'invited',
  invited_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, profile_id),
  constraint organization_members_joined_at_check
    check (
      (status = 'active' and joined_at is not null)
      or status <> 'active'
    )
);

create index organization_members_profile_active_idx
  on public.organization_members (profile_id, organization_id)
  where status = 'active';
create index organization_members_org_role_active_idx
  on public.organization_members (organization_id, role, profile_id)
  where status = 'active';
create index organization_members_invited_by_idx
  on public.organization_members (invited_by)
  where invited_by is not null;

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  created_by uuid not null
    references public.profiles(id) on delete restrict,
  title text not null,
  slug text not null unique,
  description text not null,
  operation_type public.operation_type not null,
  property_type public.property_type not null,
  publication_status public.publication_status not null default 'draft',
  availability_status public.availability_status not null default 'available',
  price_amount numeric(14, 2),
  price_on_request boolean not null default false,
  currency_code public.currency_code not null default 'HNL',
  price_period public.price_period not null default 'total',
  bedrooms smallint,
  bathrooms numeric(4, 1),
  parking_spaces smallint,
  land_area numeric(14, 2),
  land_area_unit public.area_unit,
  construction_area numeric(14, 2),
  construction_area_unit public.area_unit,
  year_built smallint,
  verification_status public.verification_status not null default 'unverified',
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  featured_until timestamptz,
  published_at timestamptz,
  last_price_update_at timestamptz not null default now(),
  availability_updated_at timestamptz not null default now(),
  reports_count integer not null default 0,
  view_count bigint not null default 0,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint listings_title_length_check
    check (char_length(title) between 10 and 180),
  constraint listings_slug_format_check
    check (
      char_length(slug) between 3 and 160
      and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
  constraint listings_description_length_check
    check (char_length(description) between 40 and 20000),
  constraint listings_price_check
    check (
      (price_on_request and price_amount is null)
      or (not price_on_request and price_amount is not null and price_amount >= 0)
    ),
  constraint listings_sale_period_check
    check (operation_type <> 'sale' or price_period = 'total'),
  constraint listings_bedrooms_check
    check (bedrooms is null or bedrooms >= 0),
  constraint listings_bathrooms_check
    check (bathrooms is null or bathrooms >= 0),
  constraint listings_parking_spaces_check
    check (parking_spaces is null or parking_spaces >= 0),
  constraint listings_land_area_check
    check (
      (land_area is null and land_area_unit is null)
      or (land_area > 0 and land_area_unit is not null)
    ),
  constraint listings_construction_area_check
    check (
      (construction_area is null and construction_area_unit is null)
      or (construction_area > 0 and construction_area_unit is not null)
    ),
  constraint listings_year_built_check
    check (year_built is null or year_built between 1800 and 2200),
  constraint listings_published_at_check
    check (publication_status <> 'published' or published_at is not null),
  constraint listings_verification_timestamp_check
    check (
      (verification_status = 'verified' and verified_at is not null)
      or (verification_status <> 'verified' and verified_at is null)
    ),
  constraint listings_counters_check
    check (reports_count >= 0 and view_count >= 0 and version > 0)
);

create index listings_created_by_idx
  on public.listings (created_by);
create index listings_verified_by_idx
  on public.listings (verified_by)
  where verified_by is not null;
create index listings_org_workflow_idx
  on public.listings (organization_id, publication_status, updated_at desc);
create index listings_public_cursor_idx
  on public.listings (published_at desc, id desc)
  where publication_status = 'published';
create index listings_public_search_idx
  on public.listings (
    operation_type,
    property_type,
    currency_code,
    price_amount
  )
  where
    publication_status = 'published'
    and availability_status = 'available'
    and price_on_request = false;
create index listings_public_availability_idx
  on public.listings (availability_status, published_at desc)
  where publication_status = 'published';

create table public.listing_managers (
  listing_id uuid not null,
  organization_id uuid not null,
  profile_id uuid not null,
  assigned_by uuid not null
    references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (listing_id, profile_id),
  foreign key (listing_id, organization_id)
    references public.listings(id, organization_id) on delete cascade,
  foreign key (organization_id, profile_id)
    references public.organization_members(organization_id, profile_id)
    on delete cascade
);

create index listing_managers_profile_idx
  on public.listing_managers (profile_id, listing_id);
create index listing_managers_organization_idx
  on public.listing_managers (organization_id, profile_id);
create index listing_managers_assigned_by_idx
  on public.listing_managers (assigned_by);

create table public.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  organization_id uuid not null,
  media_type public.listing_media_type not null,
  source_bucket text not null default 'listing-drafts',
  source_path text not null,
  public_bucket text,
  public_path text,
  processing_status public.media_processing_status not null default 'pending',
  mime_type text not null,
  size_bytes bigint not null,
  width integer,
  height integer,
  duration_seconds numeric(10, 2),
  alt_text text,
  sort_order smallint not null default 0,
  is_primary boolean not null default false,
  created_by uuid not null
    references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (listing_id, organization_id)
    references public.listings(id, organization_id) on delete cascade,
  constraint listing_media_source_bucket_check
    check (source_bucket = 'listing-drafts'),
  constraint listing_media_public_pair_check
    check (
      (public_bucket is null and public_path is null)
      or (
        public_bucket = 'listing-public'
        and public_path is not null
      )
    ),
  constraint listing_media_size_check
    check (size_bytes > 0),
  constraint listing_media_dimensions_check
    check (
      (width is null or width > 0)
      and (height is null or height > 0)
      and (duration_seconds is null or duration_seconds >= 0)
    ),
  constraint listing_media_sort_order_check
    check (sort_order >= 0),
  unique (source_bucket, source_path),
  unique (public_bucket, public_path)
);

create unique index listing_media_one_primary_idx
  on public.listing_media (listing_id)
  where is_primary = true;
create index listing_media_listing_order_idx
  on public.listing_media (listing_id, sort_order, created_at);
create index listing_media_organization_idx
  on public.listing_media (organization_id, listing_id);
create index listing_media_created_by_idx
  on public.listing_media (created_by);

create table public.listing_amenities (
  listing_id uuid not null,
  organization_id uuid not null,
  amenity_code text not null,
  display_label text,
  value text,
  created_at timestamptz not null default now(),
  primary key (listing_id, amenity_code),
  foreign key (listing_id, organization_id)
    references public.listings(id, organization_id) on delete cascade,
  constraint listing_amenities_code_check
    check (amenity_code ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  constraint listing_amenities_label_length_check
    check (display_label is null or char_length(display_label) <= 120),
  constraint listing_amenities_value_length_check
    check (value is null or char_length(value) <= 250)
);

create index listing_amenities_code_idx
  on public.listing_amenities (amenity_code, listing_id);
create index listing_amenities_organization_idx
  on public.listing_amenities (organization_id, listing_id);

create table public.listing_locations (
  listing_id uuid primary key,
  organization_id uuid not null,
  country_code text not null default 'HN',
  department text not null,
  municipality text not null,
  city text,
  zone text,
  visible_address text,
  public_latitude numeric(9, 6) not null,
  public_longitude numeric(9, 6) not null,
  public_geog extensions.geography(point, 4326) not null,
  precision public.location_precision not null default 'approximate',
  location_confirmed_at timestamptz,
  location_confirmed_by uuid
    references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (listing_id, organization_id)
    references public.listings(id, organization_id) on delete cascade,
  constraint listing_locations_country_check
    check (country_code ~ '^[A-Z]{2}$'),
  constraint listing_locations_latitude_check
    check (public_latitude between -90 and 90),
  constraint listing_locations_longitude_check
    check (public_longitude between -180 and 180),
  constraint listing_locations_address_length_check
    check (visible_address is null or char_length(visible_address) <= 500),
  constraint listing_locations_confirmation_check
    check (
      (location_confirmed_at is null and location_confirmed_by is null)
      or (
        location_confirmed_at is not null
        and location_confirmed_by is not null
      )
    )
);

create index listing_locations_organization_idx
  on public.listing_locations (organization_id, listing_id);
create index listing_locations_area_idx
  on public.listing_locations (
    country_code,
    department,
    municipality,
    city,
    zone
  );
create index listing_locations_public_geog_idx
  on public.listing_locations using gist (public_geog);
create index listing_locations_confirmed_by_idx
  on public.listing_locations (location_confirmed_by)
  where location_confirmed_by is not null;

create table public.listing_private_locations (
  listing_id uuid primary key,
  organization_id uuid not null,
  private_address text,
  exact_latitude numeric(9, 6) not null,
  exact_longitude numeric(9, 6) not null,
  exact_geog extensions.geography(point, 4326) not null,
  access_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (listing_id, organization_id)
    references public.listings(id, organization_id) on delete cascade,
  constraint listing_private_locations_latitude_check
    check (exact_latitude between -90 and 90),
  constraint listing_private_locations_longitude_check
    check (exact_longitude between -180 and 180),
  constraint listing_private_locations_address_length_check
    check (private_address is null or char_length(private_address) <= 1000),
  constraint listing_private_locations_notes_length_check
    check (access_notes is null or char_length(access_notes) <= 2000)
);

create index listing_private_locations_organization_idx
  on public.listing_private_locations (organization_id, listing_id);
create index listing_private_locations_exact_geog_idx
  on public.listing_private_locations using gist (exact_geog);

create table public.listing_price_history (
  id bigint generated always as identity primary key,
  listing_id uuid not null
    references public.listings(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,
  previous_price_amount numeric(14, 2),
  new_price_amount numeric(14, 2),
  previous_currency_code public.currency_code,
  new_currency_code public.currency_code not null,
  previous_price_period public.price_period,
  new_price_period public.price_period not null,
  changed_at timestamptz not null default now(),
  constraint listing_price_history_previous_price_check
    check (
      previous_price_amount is null
      or previous_price_amount >= 0
    ),
  constraint listing_price_history_new_price_check
    check (new_price_amount is null or new_price_amount >= 0)
);

create index listing_price_history_listing_idx
  on public.listing_price_history (listing_id, changed_at desc, id desc);
create index listing_price_history_changed_by_idx
  on public.listing_price_history (changed_by)
  where changed_by is not null;

create or replace function private.is_staff(
  allowed_roles public.staff_role[] default null
)
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
      and profile.staff_role is not null
      and (
        allowed_roles is null
        or profile.staff_role = any (allowed_roles)
      )
  );
$$;

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
    (select auth.uid()) is not null
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
    (select private.is_staff())
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
    or exists (
      select 1
      from public.listings as listing
      join public.organization_members as member
        on member.organization_id = listing.organization_id
      where listing.id = target_listing_id
        and member.profile_id = (select auth.uid())
        and member.status = 'active'
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
    (select private.is_staff())
    or exists (
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
    );
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
      and organization.status = 'active'
  );
$$;

revoke execute on function private.is_staff(public.staff_role[])
  from public, anon, authenticated, service_role;
revoke execute on function private.is_org_member(
  uuid,
  public.organization_member_role[]
) from public, anon, authenticated, service_role;
revoke execute on function private.can_manage_organization(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function private.can_view_listing(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function private.can_manage_listing(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function private.is_listing_public(uuid)
  from public, anon, authenticated, service_role;

-- RLS policies execute these helpers through their stored function OIDs.
-- The private schema remains outside the Data API and has no USAGE grant.
grant execute on function private.is_staff(public.staff_role[])
  to anon, authenticated;
grant execute on function private.is_org_member(
  uuid,
  public.organization_member_role[]
) to anon, authenticated;
grant execute on function private.can_manage_organization(uuid)
  to authenticated;
grant execute on function private.can_view_listing(uuid)
  to anon, authenticated;
grant execute on function private.can_manage_listing(uuid)
  to authenticated;
grant execute on function private.is_listing_public(uuid)
  to anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
begin
  requested_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, new.id::text), '@', 1)
  );

  if char_length(requested_name) < 2 then
    requested_name := requested_name || '_';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, left(requested_name, 120))
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function private.add_organization_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.organization_members (
    organization_id,
    profile_id,
    role,
    status,
    invited_by,
    joined_at
  )
  values (
    new.id,
    new.created_by,
    case
      when new.organization_type = 'agency'
        then 'agency_owner'::public.organization_member_role
      when new.organization_type = 'individual_owner'
        then 'property_owner'::public.organization_member_role
      else 'manager'::public.organization_member_role
    end,
    'active',
    new.created_by,
    now()
  )
  on conflict (organization_id, profile_id) do nothing;

  return new;
end;
$$;

create or replace function private.enforce_listing_workflow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  caller_is_staff boolean := (select private.is_staff());
  important_content_changed boolean := false;
begin
  if tg_op = 'INSERT' then
    if caller_id is not null and not caller_is_staff then
      if new.created_by <> caller_id
        or new.publication_status <> 'draft'
        or new.verification_status <> 'unverified'
        or new.verified_at is not null
        or new.verified_by is not null
        or new.featured_until is not null
        or new.published_at is not null
        or new.reports_count <> 0
        or new.view_count <> 0
      then
        raise exception 'listing contains protected values';
      end if;
    end if;

    if new.publication_status = 'published' and new.published_at is null then
      new.published_at := now();
    end if;

    return new;
  end if;

  if pg_trigger_depth() > 1
    and new.reports_count is distinct from old.reports_count
    and (to_jsonb(new) - 'reports_count') =
      (to_jsonb(old) - 'reports_count')
  then
    return new;
  end if;

  if caller_id is not null and not caller_is_staff then
    if new.organization_id <> old.organization_id
      or new.created_by <> old.created_by
      or new.verification_status <> old.verification_status
      or new.verified_at is distinct from old.verified_at
      or new.verified_by is distinct from old.verified_by
      or new.featured_until is distinct from old.featured_until
      or new.published_at is distinct from old.published_at
    then
      raise exception 'protected listing fields cannot be changed';
    end if;

    if new.publication_status <> old.publication_status
      and not (
        (old.publication_status = 'draft'
          and new.publication_status = 'pending_review')
        or (old.publication_status = 'pending_review'
          and new.publication_status = 'draft')
        or (old.publication_status = 'rejected'
          and new.publication_status in ('draft', 'pending_review'))
        or (old.publication_status = 'published'
          and new.publication_status = 'pending_review')
      )
    then
      raise exception 'publication status transition is not allowed';
    end if;

    important_content_changed :=
      new.title is distinct from old.title
      or new.slug is distinct from old.slug
      or new.description is distinct from old.description
      or new.operation_type is distinct from old.operation_type
      or new.property_type is distinct from old.property_type
      or new.bedrooms is distinct from old.bedrooms
      or new.bathrooms is distinct from old.bathrooms
      or new.parking_spaces is distinct from old.parking_spaces
      or new.land_area is distinct from old.land_area
      or new.land_area_unit is distinct from old.land_area_unit
      or new.construction_area is distinct from old.construction_area
      or new.construction_area_unit is distinct from old.construction_area_unit
      or new.year_built is distinct from old.year_built;

    if old.publication_status = 'published'
      and important_content_changed
      and new.publication_status <> 'pending_review'
    then
      raise exception 'important changes require a new review';
    end if;
  end if;

  if (
    new.price_amount,
    new.price_on_request,
    new.currency_code,
    new.price_period
  ) is distinct from (
    old.price_amount,
    old.price_on_request,
    old.currency_code,
    old.price_period
  ) then
    new.last_price_update_at := now();
  end if;

  if new.availability_status is distinct from old.availability_status then
    new.availability_updated_at := now();
  end if;

  if new.publication_status = 'published'
    and old.publication_status <> 'published'
    and new.published_at is null
  then
    new.published_at := now();
  end if;

  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.assign_listing_creator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.listing_managers (
    listing_id,
    organization_id,
    profile_id,
    assigned_by
  )
  select
    new.id,
    new.organization_id,
    new.created_by,
    new.created_by
  from public.organization_members as member
  where member.organization_id = new.organization_id
    and member.profile_id = new.created_by
    and member.status = 'active'
  on conflict (listing_id, profile_id) do nothing;

  return new;
end;
$$;

create or replace function private.sync_public_location_point()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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
      )
    )
  then
    raise exception 'location confirmation fields are protected';
  end if;

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

create or replace function private.enforce_listing_media_workflow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
    and not (select private.is_staff())
  then
    if tg_op = 'INSERT' then
      if new.created_by <> (select auth.uid())
        or new.processing_status <> 'pending'
        or new.public_bucket is not null
        or new.public_path is not null
      then
        raise exception 'listing media contains protected values';
      end if;
    elsif new.listing_id <> old.listing_id
      or new.organization_id <> old.organization_id
      or new.created_by <> old.created_by
      or new.source_bucket <> old.source_bucket
      or new.source_path <> old.source_path
      or new.public_bucket is distinct from old.public_bucket
      or new.public_path is distinct from old.public_path
      or new.processing_status <> old.processing_status
      or new.mime_type <> old.mime_type
      or new.size_bytes <> old.size_bytes
      or new.width is distinct from old.width
      or new.height is distinct from old.height
      or new.duration_seconds is distinct from old.duration_seconds
    then
      raise exception 'protected listing media fields cannot be changed';
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.sync_private_location_point()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.exact_geog := extensions.st_setsrid(
    extensions.st_makepoint(
      new.exact_longitude::double precision,
      new.exact_latitude::double precision
    ),
    4326
  )::extensions.geography;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.record_listing_price_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
    or (
      new.price_amount,
      new.price_on_request,
      new.currency_code,
      new.price_period
    ) is distinct from (
      old.price_amount,
      old.price_on_request,
      old.currency_code,
      old.price_period
    )
  then
    insert into public.listing_price_history (
      listing_id,
      changed_by,
      previous_price_amount,
      new_price_amount,
      previous_currency_code,
      new_currency_code,
      previous_price_period,
      new_price_period
    )
    values (
      new.id,
      (select auth.uid()),
      case when tg_op = 'INSERT' then null else old.price_amount end,
      new.price_amount,
      case when tg_op = 'INSERT' then null else old.currency_code end,
      new.currency_code,
      case when tg_op = 'INSERT' then null else old.price_period end,
      new.price_period
    );
  end if;

  return new;
end;
$$;

revoke execute on function private.set_updated_at()
  from public, anon, authenticated, service_role;
revoke execute on function private.handle_new_user()
  from public, anon, authenticated, service_role;
revoke execute on function private.add_organization_owner()
  from public, anon, authenticated, service_role;
revoke execute on function private.enforce_listing_workflow()
  from public, anon, authenticated, service_role;
revoke execute on function private.assign_listing_creator()
  from public, anon, authenticated, service_role;
revoke execute on function private.sync_public_location_point()
  from public, anon, authenticated, service_role;
revoke execute on function private.sync_private_location_point()
  from public, anon, authenticated, service_role;
revoke execute on function private.enforce_listing_media_workflow()
  from public, anon, authenticated, service_role;
revoke execute on function private.record_listing_price_change()
  from public, anon, authenticated, service_role;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function private.set_updated_at();

create trigger organization_members_set_updated_at
before update on public.organization_members
for each row execute function private.set_updated_at();

create trigger listings_enforce_workflow
before insert or update on public.listings
for each row execute function private.enforce_listing_workflow();

create trigger listing_media_set_updated_at
before update on public.listing_media
for each row execute function private.set_updated_at();

create trigger listing_media_enforce_workflow
before insert or update on public.listing_media
for each row execute function private.enforce_listing_media_workflow();

create trigger listing_locations_sync_point
before insert or update on public.listing_locations
for each row execute function private.sync_public_location_point();

create trigger listing_private_locations_sync_point
before insert or update on public.listing_private_locations
for each row execute function private.sync_private_location_point();

create trigger organizations_add_owner
after insert on public.organizations
for each row execute function private.add_organization_owner();

create trigger listings_assign_creator
after insert on public.listings
for each row execute function private.assign_listing_creator();

create trigger listings_record_price_change
after insert or update on public.listings
for each row execute function private.record_listing_price_change();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.listings enable row level security;
alter table public.listing_managers enable row level security;
alter table public.listing_media enable row level security;
alter table public.listing_amenities enable row level security;
alter table public.listing_locations enable row level security;
alter table public.listing_private_locations enable row level security;
alter table public.listing_price_history enable row level security;

create policy profiles_select_public_or_self
on public.profiles
for select
to anon, authenticated
using (
  (
    account_status = 'active'
    and verification_status = 'verified'
  )
  or id = (select auth.uid())
  or (select private.is_staff())
);

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy organizations_select_public_or_member
on public.organizations
for select
to anon, authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
  )
  or (select private.is_org_member(id))
  or (select private.is_staff())
);

create policy organizations_insert_creator
on public.organizations
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and status = 'active'
  and verification_status = 'unverified'
  and verified_at is null
  and verified_by is null
);

create policy organizations_update_managers
on public.organizations
for update
to authenticated
using ((select private.can_manage_organization(id)))
with check ((select private.can_manage_organization(id)));

create policy organization_members_select_members
on public.organization_members
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or (select private.is_org_member(organization_id))
  or (select private.is_staff())
);

create policy organization_members_insert_managers
on public.organization_members
for insert
to authenticated
with check ((select private.can_manage_organization(organization_id)));

create policy organization_members_update_managers
on public.organization_members
for update
to authenticated
using ((select private.can_manage_organization(organization_id)))
with check ((select private.can_manage_organization(organization_id)));

create policy organization_members_delete_managers
on public.organization_members
for delete
to authenticated
using ((select private.can_manage_organization(organization_id)));

create policy listings_select_published
on public.listings
for select
to anon, authenticated
using (
  publication_status = 'published'
  or (select private.can_view_listing(id))
);

create policy listings_insert_members
on public.listings
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and publication_status = 'draft'
  and (
    select private.is_org_member(
      organization_id,
      array[
        'agency_owner'::public.organization_member_role,
        'manager'::public.organization_member_role,
        'agent'::public.organization_member_role,
        'property_owner'::public.organization_member_role,
        'editor'::public.organization_member_role
      ]
    )
  )
);

create policy listings_update_managers
on public.listings
for update
to authenticated
using ((select private.can_manage_listing(id)))
with check ((select private.can_manage_listing(id)));

create policy listings_delete_drafts
on public.listings
for delete
to authenticated
using (
  publication_status = 'draft'
  and (select private.can_manage_organization(organization_id))
);

create policy listing_managers_select_members
on public.listing_managers
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or (select private.is_org_member(organization_id))
  or (select private.is_staff())
);

create policy listing_managers_insert_org_managers
on public.listing_managers
for insert
to authenticated
with check ((select private.can_manage_organization(organization_id)));

create policy listing_managers_delete_org_managers
on public.listing_managers
for delete
to authenticated
using ((select private.can_manage_organization(organization_id)));

create policy listing_media_select_public_or_managed
on public.listing_media
for select
to anon, authenticated
using (
  (
    processing_status = 'ready'
    and public_path is not null
    and (select private.is_listing_public(listing_id))
  )
  or (select private.can_view_listing(listing_id))
);

create policy listing_media_insert_managers
on public.listing_media
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.can_manage_listing(listing_id))
);

create policy listing_media_update_managers
on public.listing_media
for update
to authenticated
using ((select private.can_manage_listing(listing_id)))
with check ((select private.can_manage_listing(listing_id)));

create policy listing_media_delete_managers
on public.listing_media
for delete
to authenticated
using ((select private.can_manage_listing(listing_id)));

create policy listing_amenities_select_public_or_managed
on public.listing_amenities
for select
to anon, authenticated
using (
  (select private.is_listing_public(listing_id))
  or (select private.can_view_listing(listing_id))
);

create policy listing_amenities_insert_managers
on public.listing_amenities
for insert
to authenticated
with check ((select private.can_manage_listing(listing_id)));

create policy listing_amenities_update_managers
on public.listing_amenities
for update
to authenticated
using ((select private.can_manage_listing(listing_id)))
with check ((select private.can_manage_listing(listing_id)));

create policy listing_amenities_delete_managers
on public.listing_amenities
for delete
to authenticated
using ((select private.can_manage_listing(listing_id)));

create policy listing_locations_select_public_or_managed
on public.listing_locations
for select
to anon, authenticated
using (
  (select private.is_listing_public(listing_id))
  or (select private.can_view_listing(listing_id))
);

create policy listing_locations_insert_managers
on public.listing_locations
for insert
to authenticated
with check ((select private.can_manage_listing(listing_id)));

create policy listing_locations_update_managers
on public.listing_locations
for update
to authenticated
using ((select private.can_manage_listing(listing_id)))
with check ((select private.can_manage_listing(listing_id)));

create policy listing_locations_delete_managers
on public.listing_locations
for delete
to authenticated
using ((select private.can_manage_listing(listing_id)));

create policy listing_private_locations_select_managers
on public.listing_private_locations
for select
to authenticated
using ((select private.can_view_listing(listing_id)));

create policy listing_private_locations_insert_managers
on public.listing_private_locations
for insert
to authenticated
with check ((select private.can_manage_listing(listing_id)));

create policy listing_private_locations_update_managers
on public.listing_private_locations
for update
to authenticated
using ((select private.can_manage_listing(listing_id)))
with check ((select private.can_manage_listing(listing_id)));

create policy listing_private_locations_delete_managers
on public.listing_private_locations
for delete
to authenticated
using ((select private.can_manage_listing(listing_id)));

create policy listing_price_history_select_public_or_managed
on public.listing_price_history
for select
to anon, authenticated
using (
  (select private.is_listing_public(listing_id))
  or (select private.can_view_listing(listing_id))
);

revoke all on public.profiles from anon, authenticated, service_role;
revoke all on public.organizations from anon, authenticated, service_role;
revoke all on public.organization_members from anon, authenticated, service_role;
revoke all on public.listings from anon, authenticated, service_role;
revoke all on public.listing_managers from anon, authenticated, service_role;
revoke all on public.listing_media from anon, authenticated, service_role;
revoke all on public.listing_amenities from anon, authenticated, service_role;
revoke all on public.listing_locations from anon, authenticated, service_role;
revoke all on public.listing_private_locations from anon, authenticated, service_role;
revoke all on public.listing_price_history from anon, authenticated, service_role;

grant select on public.profiles to anon, authenticated;
grant update (
  display_name,
  slug,
  avatar_path,
  bio,
  public_phone,
  public_whatsapp,
  updated_at
) on public.profiles to authenticated;

grant select on public.organizations to anon, authenticated;
grant insert on public.organizations to authenticated;
grant update (
  name,
  legal_name,
  slug,
  description,
  logo_path,
  website_url,
  public_email,
  public_phone,
  updated_at
) on public.organizations to authenticated;

grant select, insert, delete
  on public.organization_members to authenticated;
grant update (
  role,
  status,
  joined_at,
  updated_at
) on public.organization_members to authenticated;

grant select on public.listings to anon, authenticated;
grant insert, delete on public.listings to authenticated;
grant update (
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
) on public.listings to authenticated;

grant select, insert, delete
  on public.listing_managers to authenticated;

grant select on public.listing_media to anon, authenticated;
grant insert, delete on public.listing_media to authenticated;
grant update (
  alt_text,
  sort_order,
  is_primary,
  updated_at
) on public.listing_media to authenticated;

grant select on public.listing_amenities to anon, authenticated;
grant insert, delete on public.listing_amenities to authenticated;
grant update (
  display_label,
  value
) on public.listing_amenities to authenticated;

grant select on public.listing_locations to anon, authenticated;
grant insert, delete on public.listing_locations to authenticated;
grant update (
  country_code,
  department,
  municipality,
  city,
  zone,
  visible_address,
  public_latitude,
  public_longitude,
  precision,
  updated_at
) on public.listing_locations to authenticated;

grant select, insert, delete
  on public.listing_private_locations to authenticated;
grant update (
  private_address,
  exact_latitude,
  exact_longitude,
  access_notes,
  updated_at
) on public.listing_private_locations to authenticated;

grant select (
  id,
  listing_id,
  previous_price_amount,
  new_price_amount,
  previous_currency_code,
  new_currency_code,
  previous_price_period,
  new_price_period,
  changed_at
) on public.listing_price_history to anon, authenticated;

grant all on public.profiles to service_role;
grant all on public.organizations to service_role;
grant all on public.organization_members to service_role;
grant all on public.listings to service_role;
grant all on public.listing_managers to service_role;
grant all on public.listing_media to service_role;
grant all on public.listing_amenities to service_role;
grant all on public.listing_locations to service_role;
grant all on public.listing_private_locations to service_role;
grant all on public.listing_price_history to service_role;
grant usage, select
  on sequence public.listing_price_history_id_seq
  to service_role;
