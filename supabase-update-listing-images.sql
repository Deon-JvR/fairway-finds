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
