drop policy if exists "users insert own listings" on public.listings;
create policy "users insert own listings"
on public.listings
for insert
to authenticated
with check (
  auth.uid() = seller_id
);

drop policy if exists "users read own listings" on public.listings;
create policy "users read own listings"
on public.listings
for select
to authenticated
using (
  auth.uid() = seller_id
);
