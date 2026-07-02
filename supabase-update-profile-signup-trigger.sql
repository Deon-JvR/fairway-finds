-- Run this once in Supabase SQL Editor.
-- It creates pending profile rows automatically when users sign up,
-- and backfills any Auth users who were created before this trigger existed.

alter table public.profiles add column if not exists terms_accepted boolean not null default false;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles add column if not exists address_line_1 text;
alter table public.profiles add column if not exists suburb text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists province text;
alter table public.profiles add column if not exists postal_code text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists account_type text not null default 'buyer_seller';
alter table public.profiles alter column account_type set default 'buyer_seller';
update public.profiles set account_type = 'buyer_seller' where account_type is distinct from 'buyer_seller';

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
select
  users.id,
  users.email,
  coalesce(users.raw_user_meta_data->>'full_name', ''),
  nullif(users.raw_user_meta_data->>'phone', ''),
  nullif(users.raw_user_meta_data->>'address_line_1', ''),
  nullif(users.raw_user_meta_data->>'suburb', ''),
  nullif(users.raw_user_meta_data->>'city', ''),
  nullif(users.raw_user_meta_data->>'province', ''),
  nullif(users.raw_user_meta_data->>'postal_code', ''),
  nullif(concat_ws(', ', nullif(users.raw_user_meta_data->>'suburb', ''), nullif(users.raw_user_meta_data->>'city', ''), nullif(users.raw_user_meta_data->>'province', '')), ''),
  coalesce((users.raw_user_meta_data->>'terms_accepted')::boolean, false),
  nullif(users.raw_user_meta_data->>'terms_accepted_at', '')::timestamptz,
  'buyer_seller',
  'pending',
  users.created_at,
  now()
from auth.users
where not exists (
  select 1
  from public.profiles
  where profiles.id = users.id
);
