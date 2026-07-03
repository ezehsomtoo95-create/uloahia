-- Admin management fields and policies

alter table public.profiles
  add column if not exists account_status text not null default 'active'
  check (account_status in ('active', 'suspended'));

alter table public.listings
  add column if not exists rejection_reason text,
  add column if not exists is_featured boolean not null default false;

alter table public.reports
  add column if not exists status text not null default 'open'
  check (status in ('open', 'dismissed'));

create or replace function public.admin_get_user_email(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_phone_admin() then
    raise exception 'Forbidden';
  end if;

  return (
    select email
    from auth.users
    where id = target_user_id
  );
end;
$$;

revoke all on function public.admin_get_user_email(uuid) from public;
grant execute on function public.admin_get_user_email(uuid) to authenticated;

drop policy if exists "profiles_phone_admin_update" on public.profiles;
create policy "profiles_phone_admin_update"
  on public.profiles
  for update
  to authenticated
  using (public.is_phone_admin())
  with check (public.is_phone_admin());

drop policy if exists "profiles_phone_admin_delete" on public.profiles;
create policy "profiles_phone_admin_delete"
  on public.profiles
  for delete
  to authenticated
  using (public.is_phone_admin());

drop policy if exists "reports_phone_admin_update" on public.reports;
create policy "reports_phone_admin_update"
  on public.reports
  for update
  to authenticated
  using (public.is_phone_admin())
  with check (public.is_phone_admin());

drop policy if exists "reports_phone_admin_delete" on public.reports;
create policy "reports_phone_admin_delete"
  on public.reports
  for delete
  to authenticated
  using (public.is_phone_admin());
