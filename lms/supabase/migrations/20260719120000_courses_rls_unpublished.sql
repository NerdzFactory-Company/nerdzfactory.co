-- Stop exposing unpublished courses/lessons to anonymous API clients.
-- Learners (phone auth, no Supabase JWT) only need published content.
-- Staff (Supabase email auth + lms_admins row) can read everything.

drop policy if exists "lms_courses_anon_read_all" on public.lms_courses;
drop policy if exists "lms_lessons_anon_read_all" on public.lms_lessons;

create policy "lms_courses_staff_read" on public.lms_courses
  for select to authenticated
  using (
    exists (
      select 1 from public.lms_admins
      where id = auth.uid() and status = 'active'
    )
  );

create policy "lms_lessons_staff_read" on public.lms_lessons
  for select to authenticated
  using (
    exists (
      select 1 from public.lms_admins
      where id = auth.uid() and status = 'active'
    )
  );
