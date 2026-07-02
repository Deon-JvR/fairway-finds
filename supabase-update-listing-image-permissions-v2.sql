-- Run once in Supabase SQL Editor.
-- Allows signed-in sellers to upload and clean up only their own listing photos.

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Approved users can upload listing images" on storage.objects;
drop policy if exists "Users can upload their own listing images" on storage.objects;
create policy "Users can upload their own listing images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = 'listings'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their own listing images" on storage.objects;
create policy "Users can delete their own listing images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = 'listings'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );
