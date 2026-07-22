-- Assignments (worksheets), submissions, and instructor staff role

-- ---------------------------------------------------------------------------
-- Instructor role on staff accounts
-- ---------------------------------------------------------------------------

alter table public.lms_admins
  add column if not exists role text not null default 'admin'
    check (role in ('admin', 'instructor'));

-- Any row in lms_admins (admin or instructor) may manage courses & view learners
create or replace function public.lms_assert_staff_auth()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  staff_id uuid;
begin
  staff_id := auth.uid();
  if staff_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not exists (select 1 from public.lms_admins where id = staff_id) then
    raise exception 'FORBIDDEN';
  end if;
  return staff_id;
end;
$$;

create or replace function public.lms_assert_admin_auth()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.lms_assert_staff_auth();
end;
$$;

-- ---------------------------------------------------------------------------
-- Assignments (standalone — not linked to courses yet)
-- ---------------------------------------------------------------------------

create table if not exists public.lms_assignments (
  id text primary key,
  title text not null,
  description text not null default '',
  questions jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lms_assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id text not null references public.lms_assignments(id) on delete cascade,
  learner_id uuid not null references public.lms_learners(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, learner_id)
);

create index if not exists lms_assignment_submissions_assignment_idx
  on public.lms_assignment_submissions (assignment_id);
create index if not exists lms_assignment_submissions_learner_idx
  on public.lms_assignment_submissions (learner_id);

alter table public.lms_assignments enable row level security;
alter table public.lms_assignment_submissions enable row level security;

create policy "lms_assignments_published_read"
  on public.lms_assignments for select
  using (published = true);

-- Staff sync assignment catalog (from app)
create or replace function public.lms_staff_upsert_assignment(
  p_id text,
  p_title text,
  p_description text,
  p_questions jsonb,
  p_sort_order int,
  p_published boolean
)
returns public.lms_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_assignments;
begin
  perform public.lms_assert_staff_auth();
  insert into public.lms_assignments (id, title, description, questions, sort_order, published)
  values (p_id, p_title, p_description, coalesce(p_questions, '[]'::jsonb), p_sort_order, coalesce(p_published, true))
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    questions = excluded.questions,
    sort_order = excluded.sort_order,
    published = excluded.published,
    updated_at = now()
  returning * into result;
  return result;
end;
$$;

-- Learner: list published assignments
create or replace function public.lms_list_assignments()
returns setof public.lms_assignments
language sql
security definer
set search_path = public
as $$
  select * from public.lms_assignments where published = true order by sort_order, title;
$$;

-- Learner: get own submission for an assignment
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
  select id into v_learner_id from public.lms_learners where auth_user_id = auth.uid();
  if v_learner_id is null then
    return null;
  end if;
  select * into result
  from public.lms_assignment_submissions
  where assignment_id = p_assignment_id and learner_id = v_learner_id;
  return result;
end;
$$;

-- Learner: submit or update answers
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
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select id into v_learner_id from public.lms_learners where auth_user_id = auth.uid();
  if v_learner_id is null then
    raise exception 'NOT_FOUND';
  end if;

  if not exists (select 1 from public.lms_assignments where id = p_assignment_id and published = true) then
    raise exception 'NOT_FOUND';
  end if;

  insert into public.lms_assignment_submissions (assignment_id, learner_id, answers)
  values (p_assignment_id, v_learner_id, coalesce(p_answers, '{}'::jsonb))
  on conflict (assignment_id, learner_id) do update set
    answers = excluded.answers,
    updated_at = now(),
    submitted_at = now()
  returning * into result;

  return result;
end;
$$;

-- Staff: list all assignments (including unpublished)
create or replace function public.lms_staff_list_assignments()
returns setof public.lms_assignments
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.lms_assert_staff_auth();
  return query select * from public.lms_assignments order by sort_order, title;
end;
$$;

-- Staff: submissions for one assignment with learner info
create or replace function public.lms_staff_list_submissions(p_assignment_id text)
returns table (
  id uuid,
  assignment_id text,
  learner_id uuid,
  answers jsonb,
  submitted_at timestamptz,
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

grant execute on function public.lms_staff_upsert_assignment(text, text, text, jsonb, int, boolean) to authenticated;
grant execute on function public.lms_list_assignments() to authenticated, anon;
grant execute on function public.lms_get_my_submission(text) to authenticated;
grant execute on function public.lms_submit_assignment(text, jsonb) to authenticated;
grant execute on function public.lms_staff_list_assignments() to authenticated;
grant execute on function public.lms_staff_list_submissions(text) to authenticated;
