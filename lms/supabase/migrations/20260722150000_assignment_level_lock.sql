-- Worksheet-level lock: staff can lock an assignment even when there are
-- no submissions yet. Learners cannot submit or update answers while locked.

alter table public.lms_assignments
  add column if not exists locked boolean not null default false,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by uuid references public.lms_admins(id) on delete set null;

create or replace function public.lms_staff_set_assignment_locked(
  p_assignment_id text,
  p_locked boolean
)
returns public.lms_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  staff_id uuid;
  result public.lms_assignments;
begin
  staff_id := public.lms_assert_staff_auth();

  update public.lms_assignments
  set
    locked = coalesce(p_locked, false),
    locked_at = case when coalesce(p_locked, false) then now() else null end,
    locked_by = case when coalesce(p_locked, false) then staff_id else null end
  where id = p_assignment_id
  returning * into result;

  if result is null then
    raise exception 'NOT_FOUND';
  end if;

  return result;
end;
$$;

-- Reject submits when the worksheet itself is locked (or the learner's row is).
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
  assignment_locked boolean;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  v_learner_id := public.lms_current_learner_id();
  if v_learner_id is null then
    raise exception 'LEARNER_NOT_LINKED';
  end if;

  select a.locked into assignment_locked
  from public.lms_assignments a
  where a.id = p_assignment_id and a.published = true;

  if assignment_locked is null then
    raise exception 'ASSIGNMENT_UNAVAILABLE';
  end if;

  if coalesce(assignment_locked, false) then
    raise exception 'ASSIGNMENT_LOCKED';
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

grant execute on function public.lms_staff_set_assignment_locked(text, boolean) to authenticated;
