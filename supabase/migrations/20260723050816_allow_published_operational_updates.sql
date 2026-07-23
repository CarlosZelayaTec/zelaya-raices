-- Published listings remain structurally locked, while their assigned
-- managers may keep price and availability current. The workflow trigger
-- rejects structural edits unless a new revision is submitted.
drop policy if exists listings_update_managers on public.listings;

create policy listings_update_managers
on public.listings
for update
to authenticated
using (
  (select private.can_manage_listing(id))
  and publication_status in ('draft', 'rejected', 'published')
)
with check (
  (select private.can_manage_listing(id))
  and publication_status in ('draft', 'rejected', 'published')
);
