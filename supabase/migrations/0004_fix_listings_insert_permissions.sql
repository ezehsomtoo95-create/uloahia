-- 1. Ensure RLS is enabled
alter table public.listings enable row level security;

-- 2. Grant permissions
grant usage on schema public to anon, authenticated;
grant select on public.listings to anon;
grant select, insert, update, delete on public.listings to authenticated;
grant select on public.listing_images to anon;
grant select, insert, delete on public.listing_images to authenticated;

-- 3. Safely drop policies to avoid "already exists" errors
drop policy if exists "listings_insert_own" on public.listings;
drop policy if exists "users insert own listings" on public.listings;
drop policy if exists "authenticated_users_can_insert" on public.listings;
drop policy if exists "users read own listings" on public.listings;
drop policy if exists "authenticated_users_read_own" on public.listings;

-- 4. Create your new, clean policies
create policy "authenticated_users_can_insert"
on public.listings
for insert
to authenticated
with check (auth.uid() = seller_id);

create policy "authenticated_users_read_own"
on public.listings
for select
to authenticated
using (auth.uid() = seller_id);