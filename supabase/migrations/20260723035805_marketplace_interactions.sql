-- Zelaya Raices: engagement, moderation, billing and reservation domain.

create type public.inquiry_status as enum (
  'new',
  'assigned',
  'responded',
  'closed',
  'spam'
);

create type public.contact_preference as enum (
  'email',
  'phone',
  'whatsapp',
  'in_app'
);

create type public.review_status as enum (
  'pending',
  'published',
  'rejected',
  'hidden'
);

create type public.report_reason as enum (
  'inaccurate',
  'duplicate',
  'fraud',
  'scam',
  'offensive',
  'unavailable',
  'other'
);

create type public.report_status as enum (
  'open',
  'in_review',
  'resolved',
  'dismissed'
);

create type public.moderation_action_type as enum (
  'verify',
  'unverify',
  'approve',
  'reject',
  'request_changes',
  'publish',
  'unpublish',
  'archive',
  'suspend',
  'restore',
  'resolve_report'
);

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'paused',
  'canceled',
  'expired'
);

create type public.reservation_status as enum (
  'pending',
  'confirmed',
  'rejected',
  'cancelled',
  'completed',
  'expired'
);

create table public.favorites (
  profile_id uuid not null
    references public.profiles(id) on delete cascade,
  listing_id uuid not null
    references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, listing_id)
);

create index favorites_listing_idx
  on public.favorites (listing_id, created_at desc);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  organization_id uuid not null,
  requester_id uuid not null
    references public.profiles(id) on delete cascade,
  assigned_to uuid,
  contact_name text not null,
  contact_email text,
  contact_phone text,
  contact_preference public.contact_preference not null default 'in_app',
  message text not null,
  consent_to_contact boolean not null default false,
  status public.inquiry_status not null default 'new',
  responded_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (listing_id, organization_id)
    references public.listings(id, organization_id) on delete cascade,
  foreign key (organization_id, assigned_to)
    references public.organization_members(organization_id, profile_id)
    on delete set null,
  constraint inquiries_contact_name_length_check
    check (char_length(contact_name) between 2 and 120),
  constraint inquiries_contact_method_check
    check (
      contact_preference = 'in_app'
      or (contact_preference = 'email' and contact_email is not null)
      or (
        contact_preference in ('phone', 'whatsapp')
        and contact_phone is not null
      )
    ),
  constraint inquiries_message_length_check
    check (char_length(message) between 20 and 5000),
  constraint inquiries_response_timestamp_check
    check (
      responded_at is null
      or status in ('responded', 'closed')
    ),
  constraint inquiries_closed_timestamp_check
    check (
      closed_at is null
      or status in ('closed', 'spam')
    )
);

create index inquiries_requester_idx
  on public.inquiries (requester_id, created_at desc);
create index inquiries_listing_idx
  on public.inquiries (listing_id, created_at desc);
create index inquiries_org_queue_idx
  on public.inquiries (organization_id, status, created_at desc);
create index inquiries_assigned_to_idx
  on public.inquiries (assigned_to, status, created_at desc)
  where assigned_to is not null;

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null
    references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  subject_profile_id uuid references public.profiles(id) on delete cascade,
  reservation_id uuid,
  rating smallint not null,
  title text,
  body text not null,
  status public.review_status not null default 'pending',
  moderated_by uuid references public.profiles(id) on delete set null,
  moderated_at timestamptz,
  organization_response text,
  organization_responded_by uuid
    references public.profiles(id) on delete set null,
  organization_responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_exactly_one_target_check
    check (num_nonnulls(listing_id, organization_id, subject_profile_id) = 1),
  constraint reviews_rating_check
    check (rating between 1 and 5),
  constraint reviews_title_length_check
    check (title is null or char_length(title) <= 160),
  constraint reviews_body_length_check
    check (char_length(body) between 20 and 5000),
  constraint reviews_moderation_timestamp_check
    check (
      (status = 'pending' and moderated_at is null and moderated_by is null)
      or (
        status <> 'pending'
        and moderated_at is not null
        and moderated_by is not null
      )
    ),
  constraint reviews_organization_response_check
    check (
      (
        organization_response is null
        and organization_responded_by is null
        and organization_responded_at is null
      )
      or (
        organization_response is not null
        and organization_responded_by is not null
        and organization_responded_at is not null
      )
    )
);

create unique index reviews_reviewer_listing_unique_idx
  on public.reviews (reviewer_id, listing_id)
  where listing_id is not null;
create unique index reviews_reviewer_organization_unique_idx
  on public.reviews (reviewer_id, organization_id)
  where organization_id is not null;
create unique index reviews_reviewer_profile_unique_idx
  on public.reviews (reviewer_id, subject_profile_id)
  where subject_profile_id is not null;
create index reviews_listing_public_idx
  on public.reviews (listing_id, created_at desc)
  where status = 'published' and listing_id is not null;
create index reviews_organization_public_idx
  on public.reviews (organization_id, created_at desc)
  where status = 'published' and organization_id is not null;
create index reviews_profile_public_idx
  on public.reviews (subject_profile_id, created_at desc)
  where status = 'published' and subject_profile_id is not null;
create index reviews_moderated_by_idx
  on public.reviews (moderated_by)
  where moderated_by is not null;
create index reviews_organization_responded_by_idx
  on public.reviews (organization_responded_by)
  where organization_responded_by is not null;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null
    references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  review_id uuid references public.reviews(id) on delete cascade,
  reason public.report_reason not null,
  details text,
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_exactly_one_target_check
    check (
      num_nonnulls(listing_id, organization_id, profile_id, review_id) = 1
    ),
  constraint reports_details_length_check
    check (details is null or char_length(details) <= 5000),
  constraint reports_resolution_check
    check (
      (
        status in ('open', 'in_review')
        and resolved_by is null
        and resolved_at is null
      )
      or (
        status in ('resolved', 'dismissed')
        and resolved_by is not null
        and resolved_at is not null
      )
    )
);

create index reports_reporter_idx
  on public.reports (reporter_id, created_at desc);
create index reports_listing_queue_idx
  on public.reports (listing_id, status, created_at desc)
  where listing_id is not null;
create index reports_organization_queue_idx
  on public.reports (organization_id, status, created_at desc)
  where organization_id is not null;
create index reports_profile_queue_idx
  on public.reports (profile_id, status, created_at desc)
  where profile_id is not null;
create index reports_review_queue_idx
  on public.reports (review_id, status, created_at desc)
  where review_id is not null;
create index reports_resolved_by_idx
  on public.reports (resolved_by)
  where resolved_by is not null;

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null
    references public.profiles(id) on delete restrict,
  listing_id uuid references public.listings(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  review_id uuid references public.reviews(id) on delete cascade,
  report_id uuid references public.reports(id) on delete set null,
  action public.moderation_action_type not null,
  previous_state text,
  new_state text,
  public_reason text,
  internal_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint moderation_actions_exactly_one_target_check
    check (
      num_nonnulls(listing_id, organization_id, profile_id, review_id) = 1
    ),
  constraint moderation_actions_reason_length_check
    check (public_reason is null or char_length(public_reason) <= 2000),
  constraint moderation_actions_notes_length_check
    check (internal_notes is null or char_length(internal_notes) <= 5000),
  constraint moderation_actions_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create index moderation_actions_moderator_idx
  on public.moderation_actions (moderator_id, created_at desc);
create index moderation_actions_listing_idx
  on public.moderation_actions (listing_id, created_at desc)
  where listing_id is not null;
create index moderation_actions_organization_idx
  on public.moderation_actions (organization_id, created_at desc)
  where organization_id is not null;
create index moderation_actions_profile_idx
  on public.moderation_actions (profile_id, created_at desc)
  where profile_id is not null;
create index moderation_actions_review_idx
  on public.moderation_actions (review_id, created_at desc)
  where review_id is not null;
create index moderation_actions_report_idx
  on public.moderation_actions (report_id, created_at desc)
  where report_id is not null;

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  entity_table text not null,
  entity_id uuid not null,
  operation text not null,
  before_data jsonb,
  after_data jsonb,
  request_id uuid,
  created_at timestamptz not null default now(),
  constraint audit_logs_entity_table_check
    check (entity_table ~ '^[a-z][a-z0-9_]*$'),
  constraint audit_logs_operation_check
    check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  constraint audit_logs_before_object_check
    check (before_data is null or jsonb_typeof(before_data) = 'object'),
  constraint audit_logs_after_object_check
    check (after_data is null or jsonb_typeof(after_data) = 'object')
);

create index audit_logs_entity_idx
  on public.audit_logs (entity_table, entity_id, created_at desc);
create index audit_logs_actor_idx
  on public.audit_logs (actor_id, created_at desc)
  where actor_id is not null;
create index audit_logs_organization_idx
  on public.audit_logs (organization_id, created_at desc)
  where organization_id is not null;
create index audit_logs_created_brin_idx
  on public.audit_logs using brin (created_at);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  provider text not null,
  external_customer_id text,
  external_subscription_id text,
  plan_code text not null,
  status public.subscription_status not null,
  price_amount numeric(14, 2) not null,
  currency_code public.currency_code not null,
  billing_period public.price_period not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_provider_format_check
    check (provider ~ '^[a-z][a-z0-9_]*$'),
  constraint subscriptions_plan_format_check
    check (plan_code ~ '^[a-z][a-z0-9_]*$'),
  constraint subscriptions_price_check
    check (price_amount >= 0),
  constraint subscriptions_period_check
    check (
      current_period_start is null
      or current_period_end is null
      or current_period_end > current_period_start
    ),
  constraint subscriptions_billing_period_check
    check (billing_period in ('monthly', 'yearly', 'weekly', 'daily'))
);

create unique index subscriptions_provider_external_unique_idx
  on public.subscriptions (provider, external_subscription_id)
  where external_subscription_id is not null;
create index subscriptions_organization_idx
  on public.subscriptions (organization_id, created_at desc);
create unique index subscriptions_one_current_per_org_idx
  on public.subscriptions (organization_id)
  where status in ('trialing', 'active', 'past_due', 'paused');

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  organization_id uuid not null,
  customer_id uuid not null
    references public.profiles(id) on delete restrict,
  status public.reservation_status not null default 'pending',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reservation_period tstzrange generated always as (
    tstzrange(starts_at, ends_at, '[)')
  ) stored,
  guests smallint not null default 1,
  total_amount numeric(14, 2) not null,
  currency_code public.currency_code not null,
  customer_notes text,
  internal_notes text,
  confirmed_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (listing_id, organization_id)
    references public.listings(id, organization_id) on delete restrict,
  constraint reservations_period_check
    check (ends_at > starts_at),
  constraint reservations_guests_check
    check (guests > 0),
  constraint reservations_amount_check
    check (total_amount >= 0),
  constraint reservations_customer_notes_length_check
    check (customer_notes is null or char_length(customer_notes) <= 3000),
  constraint reservations_internal_notes_length_check
    check (internal_notes is null or char_length(internal_notes) <= 5000),
  constraint reservations_confirmed_at_check
    check (
      confirmed_at is null
      or status in ('confirmed', 'completed')
    ),
  constraint reservations_canceled_at_check
    check (
      canceled_at is null
      or status in ('rejected', 'cancelled', 'expired')
    ),
  constraint reservations_no_overlap
    exclude using gist (
      listing_id with =,
      reservation_period with &&
    )
    where (status in ('pending', 'confirmed'))
);

alter table public.reviews
  add constraint reviews_reservation_fkey
  foreign key (reservation_id)
  references public.reservations(id)
  on delete set null;

create index reviews_reservation_idx
  on public.reviews (reservation_id)
  where reservation_id is not null;
create index reservations_customer_idx
  on public.reservations (customer_id, created_at desc);
create index reservations_organization_queue_idx
  on public.reservations (organization_id, status, starts_at);
create index reservations_listing_idx
  on public.reservations (listing_id, starts_at);

create or replace function private.enforce_inquiry_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
    and not (select private.is_staff())
  then
    if new.requester_id <> (select auth.uid())
      or new.status <> 'new'
      or new.assigned_to is not null
      or new.responded_at is not null
      or new.closed_at is not null
    then
      raise exception 'inquiry contains protected values';
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.enforce_review_write()
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
      if new.reviewer_id <> (select auth.uid())
        or new.status <> 'pending'
        or new.moderated_by is not null
        or new.moderated_at is not null
        or new.organization_response is not null
      then
        raise exception 'review contains protected values';
      end if;
    elsif new.reviewer_id <> old.reviewer_id
      or old.status <> 'pending'
      or new.status <> old.status
      or new.moderated_by is distinct from old.moderated_by
      or new.moderated_at is distinct from old.moderated_at
      or new.organization_response is distinct from old.organization_response
      or new.organization_responded_by
        is distinct from old.organization_responded_by
      or new.organization_responded_at
        is distinct from old.organization_responded_at
    then
      raise exception 'protected review fields cannot be changed';
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.enforce_report_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
    and not (select private.is_staff())
    and (
      new.reporter_id <> (select auth.uid())
      or new.status <> 'open'
      or new.resolved_by is not null
      or new.resolved_at is not null
      or new.resolution_notes is not null
    )
  then
    raise exception 'report contains protected values';
  end if;

  return new;
end;
$$;

create or replace function private.refresh_listing_report_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_listing_id uuid;
begin
  target_listing_id := coalesce(new.listing_id, old.listing_id);

  if target_listing_id is not null then
    update public.listings
    set reports_count = (
      select count(*)::integer
      from public.reports as report
      where report.listing_id = target_listing_id
        and report.status <> 'dismissed'
    )
    where id = target_listing_id;
  end if;

  return coalesce(new, old);
end;
$$;

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
      nullif(
        current_setting('request.headers', true)::jsonb ->> 'x-request-id',
        ''
      )::uuid
    );
  end if;

  return coalesce(new, old);
end;
$$;

revoke execute on function private.enforce_inquiry_insert()
  from public, anon, authenticated, service_role;
revoke execute on function private.enforce_review_write()
  from public, anon, authenticated, service_role;
revoke execute on function private.enforce_report_insert()
  from public, anon, authenticated, service_role;
revoke execute on function private.refresh_listing_report_count()
  from public, anon, authenticated, service_role;
revoke execute on function private.write_redacted_audit_log()
  from public, anon, authenticated, service_role;

create trigger inquiries_enforce_insert
before insert on public.inquiries
for each row execute function private.enforce_inquiry_insert();

create trigger inquiries_set_updated_at
before update on public.inquiries
for each row execute function private.set_updated_at();

create trigger reviews_enforce_write
before insert or update on public.reviews
for each row execute function private.enforce_review_write();

create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function private.set_updated_at();

create trigger reports_enforce_insert
before insert on public.reports
for each row execute function private.enforce_report_insert();

create trigger reports_set_updated_at
before update on public.reports
for each row execute function private.set_updated_at();

create trigger reports_refresh_listing_count
after insert or update of status, listing_id or delete on public.reports
for each row execute function private.refresh_listing_report_count();

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function private.set_updated_at();

create trigger reservations_set_updated_at
before update on public.reservations
for each row execute function private.set_updated_at();

create trigger listings_write_audit_log
after insert or update or delete on public.listings
for each row execute function private.write_redacted_audit_log();

create trigger organization_members_write_audit_log
after insert or update or delete on public.organization_members
for each row execute function private.write_redacted_audit_log();

create trigger subscriptions_write_audit_log
after insert or update or delete on public.subscriptions
for each row execute function private.write_redacted_audit_log();

create trigger reservations_write_audit_log
after insert or update or delete on public.reservations
for each row execute function private.write_redacted_audit_log();

alter table public.favorites enable row level security;
alter table public.inquiries enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.reservations enable row level security;

create policy favorites_select_own
on public.favorites
for select
to authenticated
using (profile_id = (select auth.uid()));

create policy favorites_insert_own
on public.favorites
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and (select private.is_listing_public(listing_id))
);

create policy favorites_delete_own
on public.favorites
for delete
to authenticated
using (profile_id = (select auth.uid()));

create policy inquiries_select_participants
on public.inquiries
for select
to authenticated
using (
  requester_id = (select auth.uid())
  or (select private.can_view_listing(listing_id))
  or (select private.is_staff())
);

create policy inquiries_insert_requester
on public.inquiries
for insert
to authenticated
with check (
  requester_id = (select auth.uid())
  and consent_to_contact = true
  and (select private.is_listing_public(listing_id))
);

create policy reviews_select_visible
on public.reviews
for select
to anon, authenticated
using (
  status = 'published'
  or reviewer_id = (select auth.uid())
  or (
    listing_id is not null
    and (select private.can_view_listing(listing_id))
  )
  or (
    organization_id is not null
    and (select private.is_org_member(organization_id))
  )
  or (select private.is_staff())
);

create policy reviews_insert_own
on public.reviews
for insert
to authenticated
with check (
  reviewer_id = (select auth.uid())
  and status = 'pending'
);

create policy reviews_update_pending_own
on public.reviews
for update
to authenticated
using (
  reviewer_id = (select auth.uid())
  and status = 'pending'
)
with check (
  reviewer_id = (select auth.uid())
  and status = 'pending'
);

create policy reviews_delete_pending_own
on public.reviews
for delete
to authenticated
using (
  reviewer_id = (select auth.uid())
  and status = 'pending'
);

create policy reports_select_owner_or_moderator
on public.reports
for select
to authenticated
using (
  reporter_id = (select auth.uid())
  or (
    select private.is_staff(
      array[
        'super_admin'::public.staff_role,
        'admin'::public.staff_role,
        'moderator'::public.staff_role
      ]
    )
  )
);

create policy reports_insert_own
on public.reports
for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and status = 'open'
);

create policy moderation_actions_select_staff
on public.moderation_actions
for select
to authenticated
using ((select private.is_staff()));

create policy moderation_actions_insert_staff
on public.moderation_actions
for insert
to authenticated
with check (
  moderator_id = (select auth.uid())
  and (select private.is_staff())
);

create policy audit_logs_select_staff
on public.audit_logs
for select
to authenticated
using ((select private.is_staff()));

create policy subscriptions_select_org_managers
on public.subscriptions
for select
to authenticated
using (
  (select private.can_manage_organization(organization_id))
);

create policy reservations_select_participants
on public.reservations
for select
to authenticated
using (
  customer_id = (select auth.uid())
  or (select private.can_view_listing(listing_id))
  or (select private.is_staff())
);

create policy reservations_insert_customer
on public.reservations
for insert
to authenticated
with check (
  customer_id = (select auth.uid())
  and status = 'pending'
  and (select private.is_listing_public(listing_id))
);

revoke all on public.favorites from anon, authenticated, service_role;
revoke all on public.inquiries from anon, authenticated, service_role;
revoke all on public.reviews from anon, authenticated, service_role;
revoke all on public.reports from anon, authenticated, service_role;
revoke all on public.moderation_actions from anon, authenticated, service_role;
revoke all on public.audit_logs from anon, authenticated, service_role;
revoke all on public.subscriptions from anon, authenticated, service_role;
revoke all on public.reservations from anon, authenticated, service_role;

grant select, insert, delete on public.favorites to authenticated;

grant select, insert on public.inquiries to authenticated;

grant select on public.reviews to anon, authenticated;
grant insert, delete on public.reviews to authenticated;
grant update (
  rating,
  title,
  body,
  updated_at
) on public.reviews to authenticated;

grant select, insert on public.reports to authenticated;

grant select, insert on public.moderation_actions to authenticated;

grant select on public.audit_logs to authenticated;

grant select on public.subscriptions to authenticated;

grant select, insert on public.reservations to authenticated;

grant all on public.favorites to service_role;
grant all on public.inquiries to service_role;
grant all on public.reviews to service_role;
grant all on public.reports to service_role;
grant all on public.moderation_actions to service_role;
grant all on public.audit_logs to service_role;
grant all on public.subscriptions to service_role;
grant all on public.reservations to service_role;
grant usage, select on sequence public.audit_logs_id_seq to service_role;
