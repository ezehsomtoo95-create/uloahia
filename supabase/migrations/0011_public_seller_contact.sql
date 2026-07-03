-- Allow any viewer to fetch seller phone for approved listings (WhatsApp / tel links).
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
    and p.phone is not null
  limit 1;
$$;

grant execute on function public.get_seller_contact(uuid) to anon, authenticated;
