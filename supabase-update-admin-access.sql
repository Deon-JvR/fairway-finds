-- Run once in Supabase SQL Editor.
-- Admin approval remains enforced by Row Level Security and never exposes a service-role key.

create or replace function public.is_fairway_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'admin@fairwayfinds.co.za';
$$;

revoke all on function public.is_fairway_admin() from public;
grant execute on function public.is_fairway_admin() to authenticated;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Approved profiles are publicly viewable" on public.profiles;
create policy "Approved profiles are publicly viewable"
  on public.profiles
  for select
  using (
    verification_status = 'approved'
    or id = (select auth.uid())
    or public.is_fairway_admin()
  );

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
  on public.profiles
  for update
  using (public.is_fairway_admin())
  with check (public.is_fairway_admin());

drop policy if exists "Admins can view all listings" on public.listings;
create policy "Admins can view all listings"
  on public.listings
  for select
  using (public.is_fairway_admin());

drop policy if exists "Admins can update listings" on public.listings;
create policy "Admins can update listings"
  on public.listings
  for update
  using (public.is_fairway_admin())
  with check (public.is_fairway_admin());
