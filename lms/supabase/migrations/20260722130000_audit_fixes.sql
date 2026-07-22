-- Audit fixes: instructor approval, admin vs staff split, worksheet locks,
-- phone normalize in lookups, assignment seed helper, submission counts,
-- email-template RLS. Run AFTER 20260722120000_assignment_submit_hardening.sql

-- ---------------------------------------------------------------------------
-- 1. Instructors require approval (same as admins)
-- ---------------------------------------------------------------------------

create or replace function public.lms_register_staff(
  p_first_name text,
  p_last_name text,
  p_role text
)
returns public.lms_admins
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_admins;
  staff_id uuid;
  staff_email text;
  staff_name text;
begin
  staff_id := auth.uid();
  if staff_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_role not in ('instructor', 'admin') then
    raise exception 'INVALID_ROLE';
  end if;

  if exists (select 1 from public.lms_admins where id = staff_id) then
    raise exception 'ALREADY_REGISTERED';
  end if;

  select email into staff_email from auth.users where id = staff_id;
  if staff_email is null then
    raise exception 'NOT_FOUND';
  end if;

  staff_name := trim(concat(coalesce(trim(p_first_name), ''), ' ', coalesce(trim(p_last_name), '')));
  if staff_name = '' then
    staff_name := staff_email;
  end if;

  insert into public.lms_admins (
    id, email, name, first_name, last_name, role, status
  )
  values (
    staff_id,
    staff_email,
    staff_name,
    coalesce(trim(p_first_name), ''),
    coalesce(trim(p_last_name), ''),
    p_role,
    'pending'
  )
  returning * into result;

  return result;
end;
$$;

-- Return type adds `role`; CREATE OR REPLACE cannot change OUT columns.
drop function if exists public.lms_admin_list_pending_staff();

create function public.lms_admin_list_pending_staff()
returns table (
  id uuid,
  email text,
  name text,
  first_name text,
  last_name text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.lms_assert_active_admin_auth();
  return query
  select a.id, a.email, a.name, a.first_name, a.last_name, a.role, a.created_at
  from public.lms_admins a
  where a.status = 'pending'
  order by a.created_at asc;
end;
$$;

grant execute on function public.lms_admin_list_pending_staff() to authenticated;

create or replace function public.lms_admin_approve_staff(p_staff_id uuid)
returns public.lms_admins
language plpgsql
security definer
set search_path = public
as $$
declare
  approver_id uuid;
  result public.lms_admins;
begin
  approver_id := public.lms_assert_active_admin_auth();

  update public.lms_admins
  set status = 'active',
      approved_at = now(),
      approved_by = approver_id,
      updated_at = now()
  where id = p_staff_id
    and status = 'pending'
  returning * into result;

  if result is null then
    raise exception 'NOT_FOUND';
  end if;

  return result;
end;
$$;

create or replace function public.lms_admin_reject_staff(p_staff_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.lms_assert_active_admin_auth();

  delete from public.lms_admins
  where id = p_staff_id
    and status = 'pending';

  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Real admin vs staff split
-- ---------------------------------------------------------------------------

create or replace function public.lms_assert_admin_auth()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid;
begin
  admin_id := auth.uid();
  if admin_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not exists (
    select 1 from public.lms_admins
    where id = admin_id and status = 'active' and role = 'admin'
  ) then
    raise exception 'FORBIDDEN';
  end if;
  return admin_id;
end;
$$;

-- Staff may edit course/lesson content; only admins may delete courses or publish.
create or replace function public.lms_admin_upsert_course(
  p_id text,
  p_title text,
  p_description text,
  p_short_description text,
  p_homepage_content text,
  p_thumbnail text,
  p_hero_image text,
  p_category text,
  p_level text,
  p_duration_estimate text,
  p_time_to_complete text,
  p_prerequisites text,
  p_target_audience text,
  p_learning_outcomes jsonb,
  p_instructor_name text,
  p_instructor_bio text,
  p_certificate_offered boolean,
  p_sort_order int,
  p_published boolean
)
returns public.lms_courses
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_courses;
  is_admin boolean;
begin
  perform public.lms_assert_staff_auth();
  select exists (
    select 1 from public.lms_admins
    where id = auth.uid() and status = 'active' and role = 'admin'
  ) into is_admin;

  insert into public.lms_courses (
    id, title, description, short_description, homepage_content,
    thumbnail, hero_image, category, level,
    duration_estimate, time_to_complete, prerequisites, target_audience,
    learning_outcomes, instructor_name, instructor_bio, certificate_offered,
    sort_order, published
  )
  values (
    p_id, p_title, p_description, p_short_description, p_homepage_content,
    p_thumbnail, p_hero_image, p_category, p_level,
    p_duration_estimate, p_time_to_complete, p_prerequisites, p_target_audience,
    coalesce(p_learning_outcomes, '[]'::jsonb), p_instructor_name, p_instructor_bio,
    coalesce(p_certificate_offered, false),
    p_sort_order,
    case when is_admin then coalesce(p_published, false) else false end
  )
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    short_description = excluded.short_description,
    homepage_content = excluded.homepage_content,
    thumbnail = excluded.thumbnail,
    hero_image = excluded.hero_image,
    category = excluded.category,
    level = excluded.level,
    duration_estimate = excluded.duration_estimate,
    time_to_complete = excluded.time_to_complete,
    prerequisites = excluded.prerequisites,
    target_audience = excluded.target_audience,
    learning_outcomes = excluded.learning_outcomes,
    instructor_name = excluded.instructor_name,
    instructor_bio = excluded.instructor_bio,
    certificate_offered = excluded.certificate_offered,
    sort_order = excluded.sort_order,
    published = case when is_admin then excluded.published else public.lms_courses.published end
  returning * into result;
  return result;
end;
$$;

create or replace function public.lms_admin_delete_course(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.lms_assert_admin_auth();
  delete from public.lms_courses where id = p_id;
end;
$$;

create or replace function public.lms_admin_set_course_published(p_id text, p_published boolean)
returns public.lms_courses
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_courses;
begin
  perform public.lms_assert_admin_auth();
  update public.lms_courses
  set published = coalesce(p_published, false)
  where id = p_id
  returning * into result;
  if not found then
    raise exception 'Course not found';
  end if;
  return result;
end;
$$;

-- Match production lesson upsert signature; switch assert to staff.
create or replace function public.lms_admin_upsert_lesson(
  p_id text,
  p_course_id text,
  p_title text,
  p_description text,
  p_video_url text,
  p_duration text,
  p_sort_order int,
  p_prerequisites text default '',
  p_objectives jsonb default '[]'::jsonb,
  p_key_takeaways jsonb default '[]'::jsonb,
  p_resources jsonb default '[]'::jsonb,
  p_thumbnail_url text default ''
)
returns public.lms_lessons
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_lessons;
begin
  perform public.lms_assert_staff_auth();
  insert into public.lms_lessons (
    id, course_id, title, description, video_url, duration, sort_order,
    prerequisites, objectives, key_takeaways, resources, thumbnail_url
  )
  values (
    p_id, p_course_id, p_title, p_description, p_video_url, p_duration, p_sort_order,
    coalesce(p_prerequisites, ''),
    coalesce(p_objectives, '[]'::jsonb),
    coalesce(p_key_takeaways, '[]'::jsonb),
    coalesce(p_resources, '[]'::jsonb),
    coalesce(p_thumbnail_url, '')
  )
  on conflict (id) do update set
    course_id = excluded.course_id,
    title = excluded.title,
    description = excluded.description,
    video_url = excluded.video_url,
    duration = excluded.duration,
    sort_order = excluded.sort_order,
    prerequisites = excluded.prerequisites,
    objectives = excluded.objectives,
    key_takeaways = excluded.key_takeaways,
    resources = excluded.resources,
    thumbnail_url = excluded.thumbnail_url
  returning * into result;
  return result;
end;
$$;

create or replace function public.lms_admin_delete_lesson(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.lms_assert_staff_auth();
  delete from public.lms_lessons where id = p_id;
end;
$$;

create or replace function public.lms_admin_update_profile(
  p_first_name text,
  p_last_name text,
  p_bio text default '',
  p_location text default '',
  p_job_title text default ''
)
returns public.lms_admins
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_admins;
  staff_id uuid;
begin
  staff_id := public.lms_assert_staff_auth();

  if p_first_name is null or length(trim(p_first_name)) < 2 then
    raise exception 'INVALID_FIRST_NAME';
  end if;
  if p_last_name is null or length(trim(p_last_name)) < 1 then
    raise exception 'INVALID_LAST_NAME';
  end if;

  update public.lms_admins
  set
    first_name = trim(p_first_name),
    last_name = trim(p_last_name),
    name = public.lms_full_name(p_first_name, p_last_name),
    bio = coalesce(p_bio, ''),
    location = coalesce(p_location, ''),
    job_title = coalesce(p_job_title, ''),
    updated_at = now()
  where id = staff_id
  returning * into result;

  return result;
end;
$$;

create or replace function public.lms_admin_reorder_courses(p_orders jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  perform public.lms_assert_staff_auth();
  if p_orders is null or jsonb_typeof(p_orders) <> 'array' then
    raise exception 'p_orders must be a JSON array';
  end if;
  for item in select * from jsonb_array_elements(p_orders)
  loop
    update public.lms_courses
    set sort_order = (item->>'sort_order')::int
    where id = item->>'id';
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Worksheet submission lock
-- ---------------------------------------------------------------------------

alter table public.lms_assignment_submissions
  add column if not exists locked boolean not null default false,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by uuid references public.lms_admins(id) on delete set null;

create or replace function public.lms_submit_assignment(
  p_assignment_id text,
  p_answers jsonb
)
returns public.lms_assignment_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_assignment_submissions;
  v_learner_id uuid;
  existing_locked boolean;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  v_learner_id := public.lms_current_learner_id();
  if v_learner_id is null then
    raise exception 'LEARNER_NOT_LINKED';
  end if;

  if not exists (
    select 1 from public.lms_assignments
    where id = p_assignment_id and published = true
  ) then
    raise exception 'ASSIGNMENT_UNAVAILABLE';
  end if;

  select locked into existing_locked
  from public.lms_assignment_submissions
  where assignment_id = p_assignment_id and learner_id = v_learner_id;

  if coalesce(existing_locked, false) then
    raise exception 'SUBMISSION_LOCKED';
  end if;

  insert into public.lms_assignment_submissions (assignment_id, learner_id, answers)
  values (p_assignment_id, v_learner_id, coalesce(p_answers, '{}'::jsonb))
  on conflict (assignment_id, learner_id) do update set
    answers = excluded.answers,
    updated_at = now(),
    submitted_at = now()
  where public.lms_assignment_submissions.locked = false
  returning * into result;

  if result is null then
    raise exception 'SUBMISSION_LOCKED';
  end if;

  return result;
end;
$$;

create or replace function public.lms_staff_set_submission_locked(
  p_submission_id uuid,
  p_locked boolean
)
returns public.lms_assignment_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  staff_id uuid;
  result public.lms_assignment_submissions;
begin
  staff_id := public.lms_assert_staff_auth();

  update public.lms_assignment_submissions
  set
    locked = coalesce(p_locked, false),
    locked_at = case when coalesce(p_locked, false) then now() else null end,
    locked_by = case when coalesce(p_locked, false) then staff_id else null end,
    updated_at = now()
  where id = p_submission_id
  returning * into result;

  if result is null then
    raise exception 'NOT_FOUND';
  end if;
  return result;
end;
$$;

drop function if exists public.lms_staff_list_submissions(text);

create function public.lms_staff_list_submissions(p_assignment_id text)
returns table (
  id uuid,
  assignment_id text,
  learner_id uuid,
  answers jsonb,
  submitted_at timestamptz,
  locked boolean,
  locked_at timestamptz,
  learner_name text,
  learner_phone text,
  learner_first_name text,
  learner_last_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.lms_assert_staff_auth();
  return query
  select
    s.id,
    s.assignment_id,
    s.learner_id,
    s.answers,
    s.submitted_at,
    s.locked,
    s.locked_at,
    l.name,
    l.phone,
    l.first_name,
    l.last_name
  from public.lms_assignment_submissions s
  join public.lms_learners l on l.id = s.learner_id
  where s.assignment_id = p_assignment_id
  order by s.submitted_at desc;
end;
$$;

create or replace function public.lms_get_my_submission(p_assignment_id text)
returns public.lms_assignment_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_assignment_submissions;
  v_learner_id uuid;
begin
  v_learner_id := public.lms_current_learner_id();
  if v_learner_id is null then
    return null;
  end if;

  select * into result
  from public.lms_assignment_submissions
  where assignment_id = p_assignment_id and learner_id = v_learner_id;

  return result;
end;
$$;

grant execute on function public.lms_staff_set_submission_locked(uuid, boolean) to authenticated;
grant execute on function public.lms_staff_list_submissions(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Phone lookups use lms_normalize_phone
-- ---------------------------------------------------------------------------

create or replace function public.lms_phone_registered(p_phone text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.lms_normalize_phone(p_phone) is not null
    and exists (
      select 1 from public.lms_learners
      where public.lms_normalize_phone(phone) = public.lms_normalize_phone(p_phone)
    );
$$;

create or replace function public.lms_current_learner_id()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  jwt_phone text;
  result_id uuid;
begin
  if uid is null then
    return null;
  end if;

  select id into result_id
  from public.lms_learners
  where auth_user_id = uid
  limit 1;
  if result_id is not null then
    return result_id;
  end if;

  jwt_phone := public.lms_normalize_phone(auth.jwt() ->> 'phone');
  if jwt_phone is null then
    return null;
  end if;

  update public.lms_learners
  set auth_user_id = uid,
      phone = case when phone like '+%' then phone else jwt_phone end
  where id = (
    select id from public.lms_learners
    where auth_user_id is null
      and public.lms_normalize_phone(phone) = jwt_phone
    limit 1
  )
  returning id into result_id;

  return result_id;
end;
$$;

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

  jwt_phone := public.lms_normalize_phone(auth.jwt() ->> 'phone');
  if jwt_phone is not null then
    update public.lms_learners
    set auth_user_id = uid,
        phone = case when phone like '+%' then phone else jwt_phone end
    where id = (
      select id from public.lms_learners
      where auth_user_id is null
        and public.lms_normalize_phone(phone) = jwt_phone
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

  req_phone := public.lms_normalize_phone(p_phone);
  if req_phone is null then
    raise exception 'INVALID_PHONE';
  end if;

  jwt_phone := public.lms_normalize_phone(auth.jwt() ->> 'phone');
  if jwt_phone is null or jwt_phone <> req_phone then
    raise exception 'FORBIDDEN';
  end if;

  select * into result
  from public.lms_learners
  where public.lms_normalize_phone(phone) = req_phone
  limit 1;

  if found then
    if result.auth_user_id is not null and result.auth_user_id <> uid then
      raise exception 'FORBIDDEN';
    end if;
    update public.lms_learners
    set auth_user_id = coalesce(auth_user_id, uid),
        phone = req_phone,
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
  values (req_phone, full_name, trim(p_first_name), trim(p_last_name), uid)
  returning * into result;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Seed assignments if catalog empty (callable by any authenticated user)
-- ---------------------------------------------------------------------------

create or replace function public.lms_seed_assignments_if_empty(p_items jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  inserted int := 0;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if exists (select 1 from public.lms_assignments limit 1) then
    return 0;
  end if;

  for item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    insert into public.lms_assignments (id, title, description, questions, sort_order, published)
    values (
      item->>'id',
      coalesce(item->>'title', item->>'id'),
      coalesce(item->>'description', ''),
      coalesce(item->'questions', '[]'::jsonb),
      coalesce((item->>'sortOrder')::int, (item->>'sort_order')::int, 0),
      coalesce((item->>'published')::boolean, true)
    )
    on conflict (id) do nothing;
    inserted := inserted + 1;
  end loop;

  return inserted;
end;
$$;

grant execute on function public.lms_seed_assignments_if_empty(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Batch submission helpers (avoid N+1)
-- ---------------------------------------------------------------------------

create or replace function public.lms_my_submitted_assignment_ids()
returns setof text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_learner_id uuid;
begin
  v_learner_id := public.lms_current_learner_id();
  if v_learner_id is null then
    return;
  end if;
  return query
  select s.assignment_id
  from public.lms_assignment_submissions s
  where s.learner_id = v_learner_id;
end;
$$;

create or replace function public.lms_staff_submission_counts()
returns table (assignment_id text, submission_count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.lms_assert_staff_auth();
  return query
  select s.assignment_id, count(*)::bigint
  from public.lms_assignment_submissions s
  group by s.assignment_id;
end;
$$;

grant execute on function public.lms_my_submitted_assignment_ids() to authenticated;
grant execute on function public.lms_staff_submission_counts() to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Email templates: active staff only; assignments require auth to list
-- ---------------------------------------------------------------------------

drop policy if exists "lms_email_templates_admin_read" on public.lms_email_templates;
create policy "lms_email_templates_admin_read" on public.lms_email_templates
  for select using (
    exists (
      select 1 from public.lms_admins
      where id = auth.uid() and status = 'active'
    )
  );

revoke execute on function public.lms_list_assignments() from public;
revoke execute on function public.lms_list_assignments() from anon;
grant execute on function public.lms_list_assignments() to authenticated;
