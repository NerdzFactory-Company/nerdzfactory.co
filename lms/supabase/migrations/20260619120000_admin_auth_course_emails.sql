-- NerdzFactory LMS migration 002
-- Admin email auth, rich course homepage fields, email templates
-- Run in Supabase SQL Editor AFTER 20260618120000_lms_tables.sql

-- ---------------------------------------------------------------------------
-- Admin accounts (linked to Supabase Auth users)
-- ---------------------------------------------------------------------------

create table if not exists public.lms_admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Extend courses with homepage / metadata fields
-- ---------------------------------------------------------------------------

alter table public.lms_courses
  add column if not exists short_description text not null default '',
  add column if not exists homepage_content text not null default '',
  add column if not exists duration_estimate text not null default '',
  add column if not exists time_to_complete text not null default '',
  add column if not exists prerequisites text not null default '',
  add column if not exists target_audience text not null default '',
  add column if not exists learning_outcomes jsonb not null default '[]'::jsonb,
  add column if not exists instructor_name text not null default '',
  add column if not exists instructor_bio text not null default '',
  add column if not exists hero_image text not null default '',
  add column if not exists certificate_offered boolean not null default false;

-- Backfill hero_image from thumbnail where empty
update public.lms_courses
set hero_image = thumbnail
where hero_image = '' and thumbnail <> '';

-- ---------------------------------------------------------------------------
-- Email templates (editable by admins in the app)
-- ---------------------------------------------------------------------------

create table if not exists public.lms_email_templates (
  id text primary key,
  name text not null,
  description text not null default '',
  category text not null default 'learner' check (category in ('learner', 'admin', 'system')),
  subject text not null default '',
  body_html text not null default '',
  body_text text not null default '',
  variables jsonb not null default '[]'::jsonb,
  sync_to_supabase_auth boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.lms_email_templates (id, name, description, category, subject, body_html, body_text, variables, sync_to_supabase_auth)
values
  (
    'learner_welcome',
    'Learner welcome',
    'Sent when a new learner signs up with their phone number.',
    'learner',
    'Welcome to NerdzFactory Learning, {{name}}!',
    '<h2>Welcome, {{name}}!</h2><p>Your account is ready. Start learning at <a href="{{app_url}}">{{app_url}}</a>.</p><p>Questions? Call us at {{support_phone}}.</p>',
    'Welcome, {{name}}! Your account is ready. Start learning at {{app_url}}. Questions? Call {{support_phone}}.',
    '["name", "app_url", "support_phone"]'::jsonb,
    false
  ),
  (
    'course_completed',
    'Course completed',
    'Sent when a learner finishes all lessons in a course.',
    'learner',
    'Congratulations! You completed {{course_title}}',
    '<h2>Well done, {{name}}!</h2><p>You have completed <strong>{{course_title}}</strong>.</p><p><a href="{{course_url}}">Review the course</a> or <a href="{{app_url}}">browse more courses</a>.</p>',
    'Well done, {{name}}! You completed {{course_title}}. Visit {{course_url}} or {{app_url}} for more.',
    '["name", "course_title", "course_url", "app_url"]'::jsonb,
    false
  ),
  (
    'admin_confirm_signup',
    'Admin confirm signup',
    'Copy this into Supabase → Authentication → Email Templates → Confirm signup.',
    'admin',
    'Confirm your NerdzFactory Learning admin account',
    '<h2>Confirm your email</h2><p>Hi {{name}}, click the link below to activate your admin account:</p><p><a href="{{confirmation_url}}">Confirm email</a></p>',
    'Hi {{name}}, confirm your admin account: {{confirmation_url}}',
    '["name", "confirmation_url"]'::jsonb,
    true
  ),
  (
    'admin_password_reset',
    'Admin password reset',
    'Copy this into Supabase → Authentication → Email Templates → Reset password.',
    'admin',
    'Reset your NerdzFactory Learning password',
    '<h2>Reset password</h2><p>Hi {{name}}, use this link to set a new password:</p><p><a href="{{reset_url}}">Reset password</a></p><p>If you did not request this, ignore this email.</p>',
    'Hi {{name}}, reset your password: {{reset_url}}',
    '["name", "reset_url"]'::jsonb,
    true
  ),
  (
    'admin_magic_link',
    'Admin magic link',
    'Copy this into Supabase → Authentication → Email Templates → Magic link.',
    'admin',
    'Your NerdzFactory Learning sign-in link',
    '<h2>Sign in</h2><p>Hi {{name}}, click below to sign in to the admin panel:</p><p><a href="{{magic_link}}">Sign in</a></p>',
    'Hi {{name}}, sign in: {{magic_link}}',
    '["name", "magic_link"]'::jsonb,
    true
  ),
  (
    'learner_progress_nudge',
    'Progress reminder',
    'Optional reminder for learners who have not finished a course.',
    'learner',
    'Continue your course: {{course_title}}',
    '<h2>Keep going, {{name}}!</h2><p>You are {{progress_percent}}% through <strong>{{course_title}}</strong>.</p><p><a href="{{course_url}}">Continue learning</a></p>',
    'Hi {{name}}, you are {{progress_percent}}% through {{course_title}}. Continue: {{course_url}}',
    '["name", "course_title", "progress_percent", "course_url"]'::jsonb,
    false
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Admin auth helper (uses Supabase JWT)
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
  if not exists (select 1 from public.lms_admins where id = admin_id) then
    raise exception 'FORBIDDEN';
  end if;
  return admin_id;
end;
$$;

-- Replace course upsert with extended fields (auth-based admin check)
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
begin
  perform public.lms_assert_admin_auth();
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
    coalesce(p_learning_outcomes, '[]'::jsonb), p_instructor_name, p_instructor_bio, p_certificate_offered,
    p_sort_order, p_published
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
    published = excluded.published
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

create or replace function public.lms_admin_upsert_lesson(
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
  perform public.lms_assert_admin_auth();
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

create or replace function public.lms_admin_delete_lesson(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.lms_assert_admin_auth();
  delete from public.lms_lessons where id = p_id;
end;
$$;

create or replace function public.lms_admin_update_email_template(
  p_id text,
  p_subject text,
  p_body_html text,
  p_body_text text
)
returns public.lms_email_templates
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_email_templates;
begin
  perform public.lms_assert_admin_auth();
  update public.lms_email_templates
  set subject = p_subject,
      body_html = p_body_html,
      body_text = p_body_text,
      updated_at = now()
  where id = p_id
  returning * into result;
  if result is null then
    raise exception 'TEMPLATE_NOT_FOUND';
  end if;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS for new tables
-- ---------------------------------------------------------------------------

alter table public.lms_admins enable row level security;
alter table public.lms_email_templates enable row level security;

create policy "lms_admins_self_read" on public.lms_admins
  for select using (auth.uid() = id);

create policy "lms_email_templates_admin_read" on public.lms_email_templates
  for select using (
    exists (select 1 from public.lms_admins where id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Grants (admin RPCs require authenticated JWT)
-- ---------------------------------------------------------------------------

grant execute on function public.lms_assert_admin_auth() to authenticated;
grant execute on function public.lms_admin_upsert_course(text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text, text, boolean, int, boolean) to authenticated;
grant execute on function public.lms_admin_delete_course(text) to authenticated;
grant execute on function public.lms_admin_upsert_lesson(text, text, text, text, text, text, int) to authenticated;
grant execute on function public.lms_admin_delete_lesson(text) to authenticated;
grant execute on function public.lms_admin_update_email_template(text, text, text, text) to authenticated;

create or replace function public.lms_admin_set_learner_role(p_learner_id uuid, p_role text)
returns public.lms_learners
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_learners;
begin
  perform public.lms_assert_admin_auth();
  update public.lms_learners set role = p_role where id = p_learner_id returning * into result;
  return result;
end;
$$;

grant execute on function public.lms_admin_set_learner_role(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Create first admin (after creating user in Supabase Auth):
--
-- 1. Authentication → Users → Add user (email + password)
-- 2. Run:
--    insert into public.lms_admins (id, email, name)
--    select id, email, coalesce(raw_user_meta_data->>'name', email)
--    from auth.users where email = 'admin@nerdzfactory.co';
-- ---------------------------------------------------------------------------
