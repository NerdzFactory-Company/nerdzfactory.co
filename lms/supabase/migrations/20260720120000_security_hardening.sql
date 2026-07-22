-- Security hardening: lock down learner/progress data, add ownership checks,
-- drop legacy anon-callable RPCs, and remove mock seed data.
-- Run in Supabase SQL Editor AFTER 20260719120000_courses_rls_unpublished.sql

-- ---------------------------------------------------------------------------
-- 1. lms_learners / lms_progress: remove world-readable policies
-- ---------------------------------------------------------------------------

drop policy if exists "lms_learners_anon_read" on public.lms_learners;
drop policy if exists "lms_progress_anon_read" on public.lms_progress;

-- Learner can read their own row (phone OTP session links auth_user_id)
create policy "lms_learners_self_read" on public.lms_learners
  for select to authenticated
  using (auth_user_id = auth.uid());

-- Active staff can read all learners
create policy "lms_learners_staff_read" on public.lms_learners
  for select to authenticated
  using (
    exists (
      select 1 from public.lms_admins
      where id = auth.uid() and status = 'active'
    )
  );

-- Learner can read their own progress
create policy "lms_progress_self_read" on public.lms_progress
  for select to authenticated
  using (
    exists (
      select 1 from public.lms_learners l
      where l.id = learner_id and l.auth_user_id = auth.uid()
    )
  );

-- Active staff can read all progress
create policy "lms_progress_staff_read" on public.lms_progress
  for select to authenticated
  using (
    exists (
      select 1 from public.lms_admins
      where id = auth.uid() and status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Replacement RPCs for reads that no longer work under RLS
-- ---------------------------------------------------------------------------

-- Pre-auth signup/signin check: exposes a boolean only, never learner PII.
create or replace function public.lms_phone_registered(p_phone text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 10
    and exists (
      select 1 from public.lms_learners
      where regexp_replace(phone, '\D', '', 'g')
          = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
    );
$$;

grant execute on function public.lms_phone_registered(text) to anon, authenticated;

-- Session bootstrap: returns the learner row for the current auth user.
-- Falls back to the verified JWT phone for legacy rows and links them.
create or replace function public.lms_get_my_learner()
returns public.lms_learners
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  jwt_phone text;
  result public.lms_learners;
begin
  if uid is null then
    return null;
  end if;

  select * into result from public.lms_learners where auth_user_id = uid;
  if found then
    return result;
  end if;

  jwt_phone := nullif(regexp_replace(coalesce(auth.jwt() ->> 'phone', ''), '\D', '', 'g'), '');
  if jwt_phone is not null then
    update public.lms_learners
    set auth_user_id = uid
    where id = (
      select id from public.lms_learners
      where auth_user_id is null
        and regexp_replace(phone, '\D', '', 'g') = jwt_phone
      limit 1
    )
    returning * into result;
    if found then
      return result;
    end if;
  end if;

  return null;
end;
$$;

grant execute on function public.lms_get_my_learner() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Ownership checks on learner write RPCs (fix IDOR)
-- ---------------------------------------------------------------------------

create or replace function public.lms_save_progress(
  p_learner_id uuid,
  p_course_id text,
  p_completed_lesson_ids text[],
  p_last_lesson_id text default null
)
returns public.lms_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_progress;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not exists (
    select 1 from public.lms_learners
    where id = p_learner_id and auth_user_id = auth.uid()
  ) then
    raise exception 'FORBIDDEN';
  end if;

  insert into public.lms_progress (learner_id, course_id, completed_lesson_ids, last_lesson_id, updated_at)
  values (p_learner_id, p_course_id, coalesce(p_completed_lesson_ids, '{}'), p_last_lesson_id, now())
  on conflict (learner_id, course_id) do update set
    completed_lesson_ids = excluded.completed_lesson_ids,
    last_lesson_id = excluded.last_lesson_id,
    updated_at = now()
  returning * into result;
  return result;
end;
$$;

revoke execute on function public.lms_save_progress(uuid, text, text[], text) from public, anon;
grant execute on function public.lms_save_progress(uuid, text, text[], text) to authenticated;

create or replace function public.lms_update_learner_profile(
  p_learner_id uuid,
  p_first_name text,
  p_last_name text,
  p_bio text default '',
  p_location text default '',
  p_job_title text default ''
)
returns public.lms_learners
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_learners;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not exists (
    select 1 from public.lms_learners
    where id = p_learner_id and auth_user_id = auth.uid()
  ) then
    raise exception 'FORBIDDEN';
  end if;

  if p_first_name is null or length(trim(p_first_name)) < 2 then
    raise exception 'INVALID_FIRST_NAME';
  end if;
  if p_last_name is null or length(trim(p_last_name)) < 1 then
    raise exception 'INVALID_LAST_NAME';
  end if;

  update public.lms_learners
  set
    first_name = trim(p_first_name),
    last_name = trim(p_last_name),
    name = public.lms_full_name(p_first_name, p_last_name),
    bio = coalesce(p_bio, ''),
    location = coalesce(p_location, ''),
    job_title = coalesce(p_job_title, ''),
    updated_at = now()
  where id = p_learner_id
  returning * into result;

  if result is null then
    raise exception 'NOT_FOUND';
  end if;
  return result;
end;
$$;

revoke execute on function public.lms_update_learner_profile(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.lms_update_learner_profile(uuid, text, text, text, text, text) to authenticated;

-- lms_ensure_learner: require a verified phone session that matches p_phone
-- (previously anon could create/rename learner rows and read back PII).
create or replace function public.lms_ensure_learner(
  p_phone text,
  p_first_name text default null,
  p_last_name text default null
)
returns public.lms_learners
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_learners;
  uid uuid;
  jwt_phone text;
  req_phone text;
  full_name text;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_phone is null or length(trim(p_phone)) < 10 then
    raise exception 'INVALID_PHONE';
  end if;

  jwt_phone := nullif(regexp_replace(coalesce(auth.jwt() ->> 'phone', ''), '\D', '', 'g'), '');
  req_phone := regexp_replace(p_phone, '\D', '', 'g');
  if jwt_phone is null or jwt_phone <> req_phone then
    raise exception 'FORBIDDEN';
  end if;

  select * into result from public.lms_learners where phone = p_phone;

  -- "found" instead of "result is not null": composite IS NULL is true for
  -- legacy rows whose auth_user_id is still null.
  if found then
    if result.auth_user_id is not null and result.auth_user_id <> uid then
      raise exception 'FORBIDDEN';
    end if;
    update public.lms_learners
    set auth_user_id = coalesce(auth_user_id, uid),
        first_name = case
          when p_first_name is not null and length(trim(p_first_name)) > 0 then trim(p_first_name)
          else first_name
        end,
        last_name = case
          when p_last_name is not null and length(trim(p_last_name)) > 0 then trim(p_last_name)
          else last_name
        end,
        name = public.lms_full_name(
          case when p_first_name is not null and length(trim(p_first_name)) > 0 then trim(p_first_name) else first_name end,
          case when p_last_name is not null and length(trim(p_last_name)) > 0 then trim(p_last_name) else last_name end
        ),
        updated_at = now()
    where id = result.id
    returning * into result;
    return result;
  end if;

  if p_first_name is null or length(trim(p_first_name)) < 2 then
    raise exception 'INVALID_FIRST_NAME';
  end if;
  if p_last_name is null or length(trim(p_last_name)) < 1 then
    raise exception 'INVALID_LAST_NAME';
  end if;

  full_name := public.lms_full_name(p_first_name, p_last_name);

  insert into public.lms_learners (phone, name, first_name, last_name, auth_user_id)
  values (p_phone, full_name, trim(p_first_name), trim(p_last_name), uid)
  returning * into result;
  return result;
end;
$$;

revoke execute on function public.lms_ensure_learner(text, text, text) from public, anon;
grant execute on function public.lms_ensure_learner(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Drop legacy RPCs (anon-callable admin writes + passwordless learner auth)
-- ---------------------------------------------------------------------------

-- Legacy p_admin_id-based admin RPCs from the first migration (privilege
-- escalation: any anon could pass a learner id with role='admin').
drop function if exists public.lms_admin_upsert_course(uuid, text, text, text, text, text, text, int, boolean);
drop function if exists public.lms_admin_delete_course(uuid, text);
drop function if exists public.lms_admin_upsert_lesson(uuid, text, text, text, text, text, text, int);
drop function if exists public.lms_admin_delete_lesson(uuid, text);
drop function if exists public.lms_admin_set_role(uuid, uuid, text);
drop function if exists public.lms_assert_admin(uuid);

-- Legacy passwordless learner auth (returned full learner rows to anon).
drop function if exists public.lms_sign_up(text, text);
drop function if exists public.lms_sign_up(text, text, text);
drop function if exists public.lms_sign_in(text);
drop function if exists public.lms_get_learner(uuid);

-- Superseded 2-arg overload (3-arg version from learner_profile remains).
drop function if exists public.lms_ensure_learner(text, text);

-- Publish toggle needs a staff session, never anon.
revoke execute on function public.lms_admin_set_course_published(text, boolean) from public, anon;
grant execute on function public.lms_admin_set_course_published(text, boolean) to authenticated;

-- Session bootstrap / registration check RPCs: lock to intended roles only.
revoke execute on function public.lms_get_my_learner() from public, anon;
revoke execute on function public.lms_phone_registered(text) from public;

-- ---------------------------------------------------------------------------
-- 5. Media storage policies: require ACTIVE staff
-- ---------------------------------------------------------------------------

drop policy if exists "lms_media_admin_insert" on storage.objects;
drop policy if exists "lms_media_admin_update" on storage.objects;
drop policy if exists "lms_media_admin_delete" on storage.objects;

create policy "lms_media_admin_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'lms-media'
  and exists (select 1 from public.lms_admins where id = auth.uid() and status = 'active')
);

create policy "lms_media_admin_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'lms-media'
  and exists (select 1 from public.lms_admins where id = auth.uid() and status = 'active')
);

create policy "lms_media_admin_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'lms-media'
  and exists (select 1 from public.lms_admins where id = auth.uid() and status = 'active')
);

-- ---------------------------------------------------------------------------
-- 6. Remove mock demo learners/submissions seeded by an earlier migration
--    (only rows never linked to a real auth account)
-- ---------------------------------------------------------------------------

do $$
declare
  mock_phones text[] := array['+2348012345678', '+2348023456789', '+2348034567890'];
begin
  delete from public.lms_assignment_submissions
  where learner_id in (
    select id from public.lms_learners
    where phone = any(mock_phones) and auth_user_id is null
  );

  delete from public.lms_progress
  where learner_id in (
    select id from public.lms_learners
    where phone = any(mock_phones) and auth_user_id is null
  );

  delete from public.lms_learners
  where phone = any(mock_phones) and auth_user_id is null;
end;
$$;
