-- Harden assignment submit/lookup: auto-link learner by verified JWT phone,
-- and use distinct error codes so the app can show clear messages.

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

  -- Legacy rows: link by verified phone on the auth session (same as lms_get_my_learner).
  jwt_phone := nullif(regexp_replace(coalesce(auth.jwt() ->> 'phone', ''), '\D', '', 'g'), '');
  if jwt_phone is null then
    return null;
  end if;

  update public.lms_learners
  set auth_user_id = uid
  where id = (
    select id from public.lms_learners
    where auth_user_id is null
      and regexp_replace(phone, '\D', '', 'g') = jwt_phone
    limit 1
  )
  returning id into result_id;

  return result_id;
end;
$$;

revoke execute on function public.lms_current_learner_id() from public, anon;
grant execute on function public.lms_current_learner_id() to authenticated;

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

revoke execute on function public.lms_submit_assignment(text, jsonb) from public, anon;
grant execute on function public.lms_submit_assignment(text, jsonb) to authenticated;

revoke execute on function public.lms_get_my_submission(text) from public, anon;
grant execute on function public.lms_get_my_submission(text) to authenticated;

-- Make ensure_learner phone lookup digit-normalized (matches registration check).
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

  select * into result
  from public.lms_learners
  where regexp_replace(phone, '\D', '', 'g') = req_phone
  limit 1;

  if found then
    if result.auth_user_id is not null and result.auth_user_id <> uid then
      raise exception 'FORBIDDEN';
    end if;
    update public.lms_learners
    set auth_user_id = coalesce(auth_user_id, uid),
        phone = case
          when phone like '+%' then phone
          else p_phone
        end,
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
