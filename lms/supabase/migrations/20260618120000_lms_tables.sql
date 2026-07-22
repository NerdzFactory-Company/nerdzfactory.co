-- NerdzFactory LMS — run in Supabase SQL Editor (project: ifkviqlzhdsaovozlbqd)

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.lms_learners (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  name text not null,
  role text not null default 'learner' check (role in ('learner', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.lms_courses (
  id text primary key,
  title text not null,
  description text not null default '',
  thumbnail text not null default '',
  category text not null default 'General',
  level text not null default 'Beginner' check (level in ('Beginner', 'Intermediate', 'Advanced')),
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.lms_lessons (
  id text primary key,
  course_id text not null references public.lms_courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  video_url text not null,
  duration text not null default '',
  sort_order int not null default 0
);

create table if not exists public.lms_progress (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.lms_learners(id) on delete cascade,
  course_id text not null references public.lms_courses(id) on delete cascade,
  completed_lesson_ids text[] not null default '{}',
  last_lesson_id text,
  updated_at timestamptz not null default now(),
  unique (learner_id, course_id)
);

create index if not exists lms_lessons_course_id_idx on public.lms_lessons(course_id);
create index if not exists lms_progress_learner_id_idx on public.lms_progress(learner_id);

-- ---------------------------------------------------------------------------
-- Auth RPCs (phone-only — no password)
-- ---------------------------------------------------------------------------

create or replace function public.lms_sign_up(p_phone text, p_name text)
returns public.lms_learners
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_learners;
begin
  if p_phone is null or length(trim(p_phone)) < 10 then
    raise exception 'INVALID_PHONE';
  end if;
  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'INVALID_NAME';
  end if;
  if exists (select 1 from public.lms_learners where phone = p_phone) then
    raise exception 'PHONE_EXISTS';
  end if;
  insert into public.lms_learners (phone, name)
  values (p_phone, trim(p_name))
  returning * into result;
  return result;
end;
$$;

create or replace function public.lms_sign_in(p_phone text)
returns public.lms_learners
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_learners;
begin
  if p_phone is null or length(trim(p_phone)) < 10 then
    raise exception 'INVALID_PHONE';
  end if;
  select * into result from public.lms_learners where phone = p_phone;
  if result is null then
    raise exception 'NOT_FOUND';
  end if;
  return result;
end;
$$;

create or replace function public.lms_get_learner(p_id uuid)
returns public.lms_learners
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_learners;
begin
  select * into result from public.lms_learners where id = p_id;
  if result is null then
    raise exception 'NOT_FOUND';
  end if;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Progress RPC
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
  if not exists (select 1 from public.lms_learners where id = p_learner_id) then
    raise exception 'LEARNER_NOT_FOUND';
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

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------

create or replace function public.lms_assert_admin(p_admin_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.lms_learners where id = p_admin_id and role = 'admin'
  ) then
    raise exception 'FORBIDDEN';
  end if;
end;
$$;

create or replace function public.lms_admin_upsert_course(
  p_admin_id uuid,
  p_id text,
  p_title text,
  p_description text,
  p_thumbnail text,
  p_category text,
  p_level text,
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
begin
  perform public.lms_assert_admin(p_admin_id);
  insert into public.lms_courses (id, title, description, thumbnail, category, level, sort_order, published)
  values (p_id, p_title, p_description, p_thumbnail, p_category, p_level, p_sort_order, p_published)
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    thumbnail = excluded.thumbnail,
    category = excluded.category,
    level = excluded.level,
    sort_order = excluded.sort_order,
    published = excluded.published
  returning * into result;
  return result;
end;
$$;

create or replace function public.lms_admin_delete_course(p_admin_id uuid, p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.lms_assert_admin(p_admin_id);
  delete from public.lms_courses where id = p_id;
end;
$$;

create or replace function public.lms_admin_upsert_lesson(
  p_admin_id uuid,
  p_id text,
  p_course_id text,
  p_title text,
  p_description text,
  p_video_url text,
  p_duration text,
  p_sort_order int
)
returns public.lms_lessons
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_lessons;
begin
  perform public.lms_assert_admin(p_admin_id);
  insert into public.lms_lessons (id, course_id, title, description, video_url, duration, sort_order)
  values (p_id, p_course_id, p_title, p_description, p_video_url, p_duration, p_sort_order)
  on conflict (id) do update set
    course_id = excluded.course_id,
    title = excluded.title,
    description = excluded.description,
    video_url = excluded.video_url,
    duration = excluded.duration,
    sort_order = excluded.sort_order
  returning * into result;
  return result;
end;
$$;

create or replace function public.lms_admin_delete_lesson(p_admin_id uuid, p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.lms_assert_admin(p_admin_id);
  delete from public.lms_lessons where id = p_id;
end;
$$;

create or replace function public.lms_admin_set_role(p_admin_id uuid, p_learner_id uuid, p_role text)
returns public.lms_learners
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_learners;
begin
  perform public.lms_assert_admin(p_admin_id);
  update public.lms_learners set role = p_role where id = p_learner_id returning * into result;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.lms_learners enable row level security;
alter table public.lms_courses enable row level security;
alter table public.lms_lessons enable row level security;
alter table public.lms_progress enable row level security;

-- Public read for published courses & lessons (anon app uses RPC for writes)
create policy "lms_courses_public_read" on public.lms_courses
  for select using (published = true);

create policy "lms_lessons_public_read" on public.lms_lessons
  for select using (
    exists (select 1 from public.lms_courses c where c.id = course_id and c.published = true)
  );

-- Admins can read all courses (including unpublished) via service — use RPC for admin reads too
create policy "lms_courses_anon_read_all" on public.lms_courses
  for select using (true);

create policy "lms_lessons_anon_read_all" on public.lms_lessons
  for select using (true);

create policy "lms_progress_anon_read" on public.lms_progress
  for select using (true);

create policy "lms_learners_anon_read" on public.lms_learners
  for select using (true);

-- Grant execute on RPCs to anon
grant execute on function public.lms_sign_up(text, text) to anon, authenticated;
grant execute on function public.lms_sign_in(text) to anon, authenticated;
grant execute on function public.lms_get_learner(uuid) to anon, authenticated;
grant execute on function public.lms_save_progress(uuid, text, text[], text) to anon, authenticated;
grant execute on function public.lms_admin_upsert_course(uuid, text, text, text, text, text, text, int, boolean) to anon, authenticated;
grant execute on function public.lms_admin_delete_course(uuid, text) to anon, authenticated;
grant execute on function public.lms_admin_upsert_lesson(uuid, text, text, text, text, text, text, int) to anon, authenticated;
grant execute on function public.lms_admin_delete_lesson(uuid, text) to anon, authenticated;
grant execute on function public.lms_admin_set_role(uuid, uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed data (placeholder courses)
-- ---------------------------------------------------------------------------

insert into public.lms_courses (id, title, description, thumbnail, category, level, sort_order, published)
values
  (
    'digital-basics',
    'Digital Skills Basics',
    'Learn the foundations of using a smartphone and the internet safely. Perfect for first-time learners.',
    'https://nerdzfactory.co/wp-content/uploads/2024/11/IMG_5349-scaled.jpg',
    'Getting Started',
    'Beginner',
    1,
    true
  ),
  (
    'communication',
    'Communication & Messaging',
    'Master WhatsApp, email basics, and professional communication for work and daily life.',
    'https://nerdzfactory.co/wp-content/uploads/2024/11/IMG_5544-scaled.jpg',
    'Communication',
    'Beginner',
    2,
    true
  ),
  (
    'work-readiness',
    'Work Readiness',
    'Build confidence for the workplace — punctuality, teamwork, and basic computer skills.',
    'https://nerdzfactory.co/wp-content/uploads/2024/11/IMG_5838.jpg',
    'Career',
    'Beginner',
    3,
    true
  )
on conflict (id) do nothing;

insert into public.lms_lessons (id, course_id, title, description, video_url, duration, sort_order)
values
  ('db-1', 'digital-basics', 'Welcome to Your Learning Journey', 'An introduction to what you will learn and how to use this platform.', 'https://www.youtube.com/watch?v=09CeBwGbCeg', '4:30', 1),
  ('db-2', 'digital-basics', 'Understanding Your Smartphone', 'Learn the main parts of your phone and what each button does.', 'https://www.youtube.com/watch?v=x0Yx3qXhL5s', '6:15', 2),
  ('db-3', 'digital-basics', 'Connecting to the Internet', 'How to turn on mobile data or Wi-Fi and browse safely.', 'https://www.youtube.com/watch?v=WR0C7iO6UI8', '5:40', 3),
  ('db-4', 'digital-basics', 'Staying Safe Online', 'Simple tips to protect yourself from scams and keep your information private.', 'https://www.youtube.com/watch?v=HxySrTjqcZE', '7:20', 4),
  ('cm-1', 'communication', 'Introduction to Messaging Apps', 'Overview of popular messaging apps and when to use each one.', 'https://www.youtube.com/watch?v=YQHsXMglC9A', '3:50', 1),
  ('cm-2', 'communication', 'Using WhatsApp Effectively', 'Send messages, voice notes, photos, and make voice calls.', 'https://www.youtube.com/watch?v=1uQu0VfNins', '8:10', 2),
  ('cm-3', 'communication', 'Writing Clear Messages', 'Tips for writing messages that are easy to understand.', 'https://www.youtube.com/watch?v=R1vskiVDwl4', '5:25', 3),
  ('wr-1', 'work-readiness', 'What Employers Look For', 'Key qualities that help you succeed at work.', 'https://www.youtube.com/watch?v=zxJM0yI9B8Y', '6:00', 1),
  ('wr-2', 'work-readiness', 'Time Management Basics', 'How to be on time and manage your daily tasks.', 'https://www.youtube.com/watch?v=iONDebHX9qk', '5:15', 2),
  ('wr-3', 'work-readiness', 'Working in a Team', 'How to collaborate and communicate with colleagues.', 'https://www.youtube.com/watch?v=hHIikHJV9fI', '7:45', 3),
  ('wr-4', 'work-readiness', 'Introduction to Computers', 'Mouse, keyboard, and opening programs on a computer.', 'https://www.youtube.com/watch?v=5mgooiBzdAM', '9:30', 4),
  ('wr-5', 'work-readiness', 'Your Next Steps', 'Celebrate your progress and plan what to learn next.', 'https://www.youtube.com/watch?v=9No-FiEInLA', '4:00', 5)
on conflict (id) do nothing;

-- First admin: sign up with this phone via the app, then run:
-- update public.lms_learners set role = 'admin' where phone = '+2349164638956';
