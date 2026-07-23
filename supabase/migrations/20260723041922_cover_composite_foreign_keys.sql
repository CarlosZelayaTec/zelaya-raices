-- Cover composite foreign keys in the same column order used by their
-- constraints. This keeps parent updates/deletes from scanning child tables.
create index inquiries_listing_organization_idx
  on public.inquiries (listing_id, organization_id);

create index inquiries_organization_assignee_idx
  on public.inquiries (organization_id, assigned_to);

create index listing_amenities_listing_organization_idx
  on public.listing_amenities (listing_id, organization_id);

create index listing_locations_listing_organization_idx
  on public.listing_locations (listing_id, organization_id);

create index listing_managers_listing_organization_idx
  on public.listing_managers (listing_id, organization_id);

create index listing_media_listing_organization_idx
  on public.listing_media (listing_id, organization_id);

create index listing_private_locations_listing_organization_idx
  on public.listing_private_locations (listing_id, organization_id);

create index reservations_listing_organization_idx
  on public.reservations (listing_id, organization_id);
