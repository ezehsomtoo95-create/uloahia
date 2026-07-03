alter table public.listings
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "listings_public_approved_select" on public.listings;
create policy "listings_public_approved_select"
  on public.listings for select
  using (status = 'approved' or auth.uid() = seller_id or public.is_admin());

drop policy if exists "listings_insert_own" on public.listings;
create policy "listings_insert_own"
  on public.listings for insert
  with check (auth.uid() = seller_id and status = 'pending');

drop policy if exists "listings_update_own" on public.listings;
create policy "listings_update_own"
  on public.listings for update
  using (auth.uid() = seller_id)
  with check (
    auth.uid() = seller_id
    and status in ('pending', 'sold')
  );

drop policy if exists "listings_admin_update" on public.listings;
create policy "listings_admin_update"
  on public.listings for update
  using (public.is_admin())
  with check (
    public.is_admin()
    and status in ('approved', 'rejected', 'pending', 'sold')
  );

create or replace function public.get_seller_sold_count(seller_uuid uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.listings
  where seller_id = seller_uuid
    and status = 'sold';
$$;
