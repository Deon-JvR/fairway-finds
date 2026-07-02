-- Run this in Supabase SQL Editor after deploying this site update.
-- It lets sellers edit their own listings, but forces edited listings back into
-- draft/pending review so admin approval cannot be bypassed from the browser.

alter table public.listings add column if not exists listing_review_status text not null default 'pending'
  check (listing_review_status in ('pending', 'approved', 'rejected'));

alter table public.listings add column if not exists admin_notes text;
alter table public.listings add column if not exists reviewed_at timestamptz;
alter table public.listings alter column status set default 'draft';

drop policy if exists "Active listings are viewable by everyone" on public.listings;

create policy "Active listings are viewable by everyone"
  on public.listings
  for select
  using (
    (
      status in ('active', 'reserved', 'sold')
      and listing_review_status = 'approved'
    )
    or (select auth.uid()) = seller_id
  );

drop policy if exists "Sellers can update their own listings" on public.listings;

create policy "Sellers can update their own listings"
  on public.listings
  for update
  using ((select auth.uid()) = seller_id)
  with check (
    (select auth.uid()) = seller_id
    and (
      (listing_review_status = 'pending' and status = 'draft')
      or status = 'removed'
    )
  );
