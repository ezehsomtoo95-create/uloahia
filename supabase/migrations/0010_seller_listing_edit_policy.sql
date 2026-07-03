-- Allow sellers to update their own listings in any status (e.g. edit from My Listings).
drop policy if exists "listings_update_own" on public.listings;

create policy "listings_update_own"
  on public.listings for update
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);
