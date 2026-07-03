create table if not exists public.app_config (
  key text primary key,
  value text not null
);

alter table public.app_config enable row level security;

drop policy if exists "app_config_admin_seed" on public.app_config;
create policy "app_config_admin_seed"
  on public.app_config
  for insert
  to authenticated
  with check (
    key = 'admin_phone'
    and value = (select phone from public.profiles where id = auth.uid())
  );

drop policy if exists "app_config_admin_update" on public.app_config;
create policy "app_config_admin_update"
  on public.app_config
  for update
  to authenticated
  using (
    key = 'admin_phone'
    and value = (select phone from public.profiles where id = auth.uid())
  )
  with check (
    key = 'admin_phone'
    and value = (select phone from public.profiles where id = auth.uid())
  );

drop policy if exists "app_config_admin_read" on public.app_config;
create policy "app_config_admin_read"
  on public.app_config
  for select
  to authenticated
  using (true);

create or replace function public.is_phone_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    inner join public.app_config c on c.key = 'admin_phone'
    where p.id = auth.uid()
      and p.phone = c.value
  );
$$;

drop policy if exists "listings_phone_admin_select" on public.listings;
create policy "listings_phone_admin_select"
  on public.listings
  for select
  to authenticated
  using (public.is_phone_admin());

drop policy if exists "listings_phone_admin_update" on public.listings;
create policy "listings_phone_admin_update"
  on public.listings
  for update
  to authenticated
  using (public.is_phone_admin())
  with check (public.is_phone_admin());

drop policy if exists "listings_phone_admin_delete" on public.listings;
create policy "listings_phone_admin_delete"
  on public.listings
  for delete
  to authenticated
  using (public.is_phone_admin());

drop policy if exists "listing_images_phone_admin_select" on public.listing_images;
create policy "listing_images_phone_admin_select"
  on public.listing_images
  for select
  to authenticated
  using (public.is_phone_admin());

drop policy if exists "listing_images_phone_admin_delete" on public.listing_images;
create policy "listing_images_phone_admin_delete"
  on public.listing_images
  for delete
  to authenticated
  using (public.is_phone_admin());

drop policy if exists "profiles_phone_admin_select" on public.profiles;
create policy "profiles_phone_admin_select"
  on public.profiles
  for select
  to authenticated
  using (public.is_phone_admin() or auth.uid() = id);
