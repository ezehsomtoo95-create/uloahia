create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text not null unique,
  full_name text,
  state text,
  city text,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  category text not null,
  condition text not null,
  price numeric(12, 2) not null check (price >= 0),
  description text not null check (char_length(description) <= 2000),
  state text not null,
  city text not null,
  area text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'sold')),
  views integer not null default 0 check (views >= 0),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.listing_images (
  listing_id uuid not null references public.listings(id) on delete cascade,
  image_url text not null,
  position integer not null default 0 check (position >= 0 and position < 7),
  primary key (listing_id, position)
);

create table if not exists public.saved_listings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists listings_public_feed_idx
  on public.listings (status, created_at desc);

create index if not exists listings_seller_idx
  on public.listings (seller_id, created_at desc);

create index if not exists listing_images_listing_idx
  on public.listing_images (listing_id, position);

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.saved_listings enable row level security;
alter table public.reports enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone, full_name)
  values (new.id, coalesce(new.phone, ''), new.raw_user_meta_data->>'full_name')
  on conflict (id) do update
    set phone = excluded.phone,
        full_name = coalesce(excluded.full_name, public.profiles.full_name);

  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.get_seller_contact(listing_uuid uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select p.phone
  from public.listings l
  join public.profiles p on p.id = l.seller_id
  where l.id = listing_uuid
    and l.status = 'approved'
    and auth.uid() is not null
  limit 1;
$$;

create or replace function public.increment_listing_views(listing_uuid uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.listings
  set views = views + 1
  where id = listing_uuid
    and status = 'approved';
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

drop policy if exists "listings_delete_own" on public.listings;
create policy "listings_delete_own"
  on public.listings for delete
  using (auth.uid() = seller_id);

drop policy if exists "listing_images_public_select" on public.listing_images;
create policy "listing_images_public_select"
  on public.listing_images for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'approved' or l.seller_id = auth.uid())
    )
  );

drop policy if exists "listing_images_seller_insert" on public.listing_images;
create policy "listing_images_seller_insert"
  on public.listing_images for insert
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.seller_id = auth.uid()
    )
  );

drop policy if exists "listing_images_seller_delete" on public.listing_images;
create policy "listing_images_seller_delete"
  on public.listing_images for delete
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.seller_id = auth.uid()
    )
  );

drop policy if exists "saved_listings_select_own" on public.saved_listings;
create policy "saved_listings_select_own"
  on public.saved_listings for select
  using (auth.uid() = user_id);

drop policy if exists "saved_listings_insert_own" on public.saved_listings;
create policy "saved_listings_insert_own"
  on public.saved_listings for insert
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
  using (auth.uid() = user_id);

drop policy if exists "reports_insert_authenticated" on public.reports;
create policy "reports_insert_authenticated"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

drop policy if exists "listing_images_storage_public_read" on storage.objects;
create policy "listing_images_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'listing-images');

drop policy if exists "listing_images_storage_auth_insert" on storage.objects;
create policy "listing_images_storage_auth_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "listing_images_storage_owner_delete" on storage.objects;
create policy "listing_images_storage_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'listing-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
