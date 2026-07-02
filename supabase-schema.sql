create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  phone text,
  address_line_1 text,
  address_line_2 text,
  suburb text,
  city text,
  province text,
  postal_code text,
  terms_accepted boolean not null default false,
  terms_accepted_at timestamptz,
  location text,
  account_type text not null default 'buyer_seller'
    check (account_type = 'buyer_seller'),
  bio text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'approved', 'rejected', 'suspended')),
  verified_at timestamptz,
  approved_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists verification_status text not null default 'pending'
  check (verification_status in ('pending', 'approved', 'rejected', 'suspended'));
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists verified_at timestamptz;
alter table public.profiles add column if not exists approved_at timestamptz;
alter table public.profiles add column if not exists admin_notes text;
alter table public.profiles add column if not exists address_line_1 text;
alter table public.profiles add column if not exists address_line_2 text;
alter table public.profiles add column if not exists suburb text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists province text;
alter table public.profiles add column if not exists postal_code text;
alter table public.profiles add column if not exists terms_accepted boolean not null default false;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    address_line_1,
    suburb,
    city,
    province,
    postal_code,
    location,
    terms_accepted,
    terms_accepted_at,
    account_type,
    verification_status,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'address_line_1', ''),
    nullif(new.raw_user_meta_data->>'suburb', ''),
    nullif(new.raw_user_meta_data->>'city', ''),
    nullif(new.raw_user_meta_data->>'province', ''),
    nullif(new.raw_user_meta_data->>'postal_code', ''),
    nullif(concat_ws(', ', nullif(new.raw_user_meta_data->>'suburb', ''), nullif(new.raw_user_meta_data->>'city', ''), nullif(new.raw_user_meta_data->>'province', '')), ''),
    coalesce((new.raw_user_meta_data->>'terms_accepted')::boolean, false),
    nullif(new.raw_user_meta_data->>'terms_accepted_at', '')::timestamptz,
    'buyer_seller',
    'pending',
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    phone = excluded.phone,
    address_line_1 = excluded.address_line_1,
    suburb = excluded.suburb,
    city = excluded.city,
    province = excluded.province,
    postal_code = excluded.postal_code,
    location = excluded.location,
    terms_accepted = excluded.terms_accepted,
    terms_accepted_at = excluded.terms_accepted_at,
    account_type = 'buyer_seller',
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create policy "Profiles are viewable by everyone"
  on public.profiles
  for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  using ((select auth.uid()) = id)
  with check (
    (select auth.uid()) = id
    and verification_status = (
      select existing.verification_status
      from public.profiles as existing
      where existing.id = (select auth.uid())
    )
    and verified_at is not distinct from (
      select existing.verified_at
      from public.profiles as existing
      where existing.id = (select auth.uid())
    )
    and approved_at is not distinct from (
      select existing.approved_at
      from public.profiles as existing
      where existing.id = (select auth.uid())
    )
    and admin_notes is not distinct from (
      select existing.admin_notes
      from public.profiles as existing
      where existing.id = (select auth.uid())
    )
  );

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null,
  brand text,
  model text,
  condition text not null,
  equipment_grade text not null default 'good'
    check (equipment_grade in ('new', 'like_new', 'excellent', 'very_good', 'good', 'fair', 'for_parts')),
  price_cents integer not null check (price_cents > 0),
  location text not null,
  description text not null,
  image_url text,
  image_urls jsonb not null default '[]'::jsonb,
  featured_requested boolean not null default false,
  is_featured boolean not null default false,
  featured_payment_status text not null default 'not_requested'
    check (featured_payment_status in ('not_requested', 'pending_payment', 'paid', 'refunded', 'cancelled')),
  featured_fee_cents integer not null default 0 check (featured_fee_cents >= 0),
  featured_until timestamptz,
  parcel_weight_kg numeric(8, 2) not null default 1.00 check (parcel_weight_kg > 0),
  parcel_length_cm numeric(8, 2) not null default 100.00 check (parcel_length_cm > 0),
  parcel_width_cm numeric(8, 2) not null default 20.00 check (parcel_width_cm > 0),
  parcel_height_cm numeric(8, 2) not null default 20.00 check (parcel_height_cm > 0),
  listing_review_status text not null default 'pending'
    check (listing_review_status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'reserved', 'sold', 'removed')),
  commission_rate numeric(5, 2) not null default 0.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listings add column if not exists equipment_grade text not null default 'good'
  check (equipment_grade in ('new', 'like_new', 'excellent', 'very_good', 'good', 'fair', 'for_parts'));
alter table public.listings add column if not exists parcel_weight_kg numeric(8, 2) not null default 1.00 check (parcel_weight_kg > 0);
alter table public.listings add column if not exists parcel_length_cm numeric(8, 2) not null default 100.00 check (parcel_length_cm > 0);
alter table public.listings add column if not exists parcel_width_cm numeric(8, 2) not null default 20.00 check (parcel_width_cm > 0);
alter table public.listings add column if not exists parcel_height_cm numeric(8, 2) not null default 20.00 check (parcel_height_cm > 0);
alter table public.listings add column if not exists listing_review_status text not null default 'pending'
  check (listing_review_status in ('pending', 'approved', 'rejected'));
alter table public.listings add column if not exists admin_notes text;
alter table public.listings add column if not exists reviewed_at timestamptz;
alter table public.listings add column if not exists image_urls jsonb not null default '[]'::jsonb;
alter table public.listings add column if not exists featured_requested boolean not null default false;
alter table public.listings add column if not exists is_featured boolean not null default false;
alter table public.listings add column if not exists featured_payment_status text not null default 'not_requested'
  check (featured_payment_status in ('not_requested', 'pending_payment', 'paid', 'refunded', 'cancelled'));
alter table public.listings add column if not exists featured_fee_cents integer not null default 0 check (featured_fee_cents >= 0);
alter table public.listings add column if not exists featured_until timestamptz;
alter table public.listings alter column status set default 'draft';
alter table public.listings alter column commission_rate set default 0.00;

alter table public.listings enable row level security;

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

create policy "Sellers can create their own listings"
  on public.listings
  for insert
  with check (
    (select auth.uid()) = seller_id
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid())
      and verification_status = 'approved'
      and account_type = 'buyer_seller'
    )
  );

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

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update set public = true;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'Listing images are publicly readable'
  ) then
    create policy "Listing images are publicly readable"
      on storage.objects
      for select
      using (bucket_id = 'listing-images');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'Approved users can upload listing images'
  ) then
    create policy "Approved users can upload listing images"
      on storage.objects
      for insert
      with check (
        bucket_id = 'listing-images'
        and (select auth.uid()) is not null
      );
  end if;
end $$;

-- Run this from Supabase SQL Editor with your own admin email.
-- It approves a user so they can buy and sell.
-- update public.profiles
-- set verification_status = 'approved',
--     verified_at = now(),
--     approved_at = now(),
--     admin_notes = 'Approved by Fairway Finds admin'
-- where id = (
--   select id from auth.users where email = 'seller@example.com'
-- );
