-- Ensure saved_listings RLS policies match app expectations (authenticated users only).
-- Table-level grants are required alongside RLS (see 0004_fix_listings_insert_permissions.sql).

grant usage on schema public to anon, authenticated;
grant select, insert, delete on public.saved_listings to authenticated;

drop policy if exists "saved_listings_select_own" on public.saved_listings;
create policy "saved_listings_select_own"
  on public.saved_listings for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "saved_listings_insert_own" on public.saved_listings;
create policy "saved_listings_insert_own"
  on public.saved_listings for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.status = 'approved'
    )
  );

drop policy if exists "saved_listings_delete_own" on public.saved_listings;
create policy "saved_listings_delete_own"
  on public.saved_listings for delete
  to authenticated
  using (auth.uid() = user_id);
