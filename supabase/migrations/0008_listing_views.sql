create table if not exists public.listing_views (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  visitor_id text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists listing_views_listing_visitor_idx
  on public.listing_views (listing_id, visitor_id);

create index if not exists listing_views_guest_expiry_idx
  on public.listing_views (created_at)
  where visitor_id like 'guest:%';

alter table public.listing_views enable row level security;

-- Views are recorded only through the RPC below.
drop policy if exists "listing_views_no_direct_access" on public.listing_views;
create policy "listing_views_no_direct_access"
  on public.listing_views
  for all
  to anon, authenticated
  using (false)
  with check (false);

create or replace function public.record_listing_view(
  listing_uuid uuid,
  p_visitor_id text,
  p_is_guest boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  already_viewed boolean;
begin
  if p_visitor_id is null or length(trim(p_visitor_id)) = 0 then
    return;
  end if;

  if not exists (
    select 1
    from public.listings
    where id = listing_uuid
      and status = 'approved'
  ) then
    return;
  end if;

  if auth.uid() is not null and exists (
    select 1
    from public.listings
    where id = listing_uuid
      and seller_id = auth.uid()
  ) then
    return;
  end if;

  delete from public.listing_views
  where visitor_id like 'guest:%'
    and created_at < now() - interval '24 hours';

  if p_is_guest then
    select exists (
      select 1
      from public.listing_views
      where listing_id = listing_uuid
        and visitor_id = p_visitor_id
        and created_at >= now() - interval '24 hours'
    ) into already_viewed;
  else
    select exists (
      select 1
      from public.listing_views
      where listing_id = listing_uuid
        and visitor_id = p_visitor_id
    ) into already_viewed;
  end if;

  if already_viewed then
    return;
  end if;

  delete from public.listing_views
  where listing_id = listing_uuid
    and visitor_id = p_visitor_id;

  insert into public.listing_views (listing_id, visitor_id)
  values (listing_uuid, p_visitor_id);

  update public.listings
  set views = views + 1
  where id = listing_uuid;
end;
$$;

grant execute on function public.record_listing_view(uuid, text, boolean) to anon, authenticated;
