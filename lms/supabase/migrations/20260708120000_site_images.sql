-- Site-wide image overrides (logos, hero photos, favicon, default artwork)
-- Managed from the admin panel (Media tab). Keys map to defaults in the app;
-- a missing row means "use the built-in default".

create table if not exists public.lms_site_images (
  key text primary key,
  url text not null,
  updated_at timestamptz not null default now()
);

alter table public.lms_site_images enable row level security;

-- Signed-out visitors need these too (login page logo/partner logo)
create policy "lms_site_images_public_read" on public.lms_site_images
  for select using (true);

create policy "lms_site_images_admin_insert" on public.lms_site_images
  for insert to authenticated
  with check (
    exists (
      select 1 from public.lms_admins
      where id = auth.uid() and role = 'admin' and status = 'active'
    )
  );

create policy "lms_site_images_admin_update" on public.lms_site_images
  for update to authenticated
  using (
    exists (
      select 1 from public.lms_admins
      where id = auth.uid() and role = 'admin' and status = 'active'
    )
  );

create policy "lms_site_images_admin_delete" on public.lms_site_images
  for delete to authenticated
  using (
    exists (
      select 1 from public.lms_admins
      where id = auth.uid() and role = 'admin' and status = 'active'
    )
  );
