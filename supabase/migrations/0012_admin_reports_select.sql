-- Allow phone admin to read marketplace reports for the operations dashboard.
drop policy if exists "reports_phone_admin_select" on public.reports;
create policy "reports_phone_admin_select"
  on public.reports
  for select
  to authenticated
  using (public.is_phone_admin());
