-- Course images (thumbnails, hero banners) — public read, admin upload

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lms-media',
  'lms-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "lms_media_public_read"
on storage.objects for select
using (bucket_id = 'lms-media');

create policy "lms_media_admin_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'lms-media'
  and exists (select 1 from public.lms_admins where id = auth.uid())
);

create policy "lms_media_admin_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'lms-media'
  and exists (select 1 from public.lms_admins where id = auth.uid())
);

create policy "lms_media_admin_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'lms-media'
  and exists (select 1 from public.lms_admins where id = auth.uid())
);
