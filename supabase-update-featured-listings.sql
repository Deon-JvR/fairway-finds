alter table public.listings
add column if not exists featured_requested boolean not null default false;

alter table public.listings
add column if not exists is_featured boolean not null default false;

alter table public.listings
add column if not exists featured_payment_status text not null default 'not_requested'
  check (featured_payment_status in ('not_requested', 'pending_payment', 'paid', 'refunded', 'cancelled'));

alter table public.listings
add column if not exists featured_fee_cents integer not null default 0 check (featured_fee_cents >= 0);

alter table public.listings
add column if not exists featured_until timestamptz;
