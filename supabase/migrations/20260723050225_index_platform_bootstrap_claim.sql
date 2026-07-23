create index platform_bootstrap_claimed_by_idx
  on private.platform_bootstrap (claimed_by)
  where claimed_by is not null;
