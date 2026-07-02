do $$
declare
  constraint_name text;
begin
  select conname
    into constraint_name
    from pg_constraint
   where conrelid = 'public.profiles'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) like '%account_type%';

  if constraint_name is not null then
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.profiles add column if not exists account_type text not null default 'buyer_seller';
alter table public.profiles alter column account_type set default 'buyer_seller';
update public.profiles set account_type = 'buyer_seller' where account_type is distinct from 'buyer_seller';

alter table public.profiles
  add constraint profiles_account_type_check
  check (account_type = 'buyer_seller');

alter table public.listings alter column commission_rate set default 0.00;
update public.listings set commission_rate = 0.00 where commission_rate = 10.00;
