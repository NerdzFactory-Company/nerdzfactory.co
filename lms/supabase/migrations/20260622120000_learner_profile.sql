-- Learner & admin profile fields (first name, last name, optional details)

alter table public.lms_learners
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '',
  add column if not exists bio text not null default '',
  add column if not exists location text not null default '',
  add column if not exists job_title text not null default '',
  add column if not exists updated_at timestamptz not null default now();

alter table public.lms_admins
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '',
  add column if not exists bio text not null default '',
  add column if not exists location text not null default '',
  add column if not exists job_title text not null default '',
  add column if not exists updated_at timestamptz not null default now();

-- Backfill from legacy name column
update public.lms_learners
set
  first_name = coalesce(nullif(trim(split_part(trim(name), ' ', 1)), ''), trim(name)),
  last_name = coalesce(
    nullif(trim(substring(trim(name) from position(' ' in trim(name)) + 1)), ''),
    ''
  )
where first_name = '' or first_name is null;

update public.lms_admins
set
  first_name = coalesce(nullif(trim(split_part(trim(name), ' ', 1)), ''), trim(name)),
  last_name = coalesce(
    nullif(trim(substring(trim(name) from position(' ' in trim(name)) + 1)), ''),
    ''
  )
where first_name = '' or first_name is null;

create or replace function public.lms_full_name(p_first text, p_last text)
returns text
language sql
immutable
as $$
  select trim(concat(trim(coalesce(p_first, '')), ' ', trim(coalesce(p_last, ''))));
$$;

-- Sign up with first + last name
create or replace function public.lms_sign_up(
  p_phone text,
  p_first_name text,
  p_last_name text
)
returns public.lms_learners
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_learners;
  full_name text;
begin
  if p_phone is null or length(trim(p_phone)) < 10 then
    raise exception 'INVALID_PHONE';
  end if;
  if p_first_name is null or length(trim(p_first_name)) < 2 then
    raise exception 'INVALID_FIRST_NAME';
  end if;
  if p_last_name is null or length(trim(p_last_name)) < 1 then
    raise exception 'INVALID_LAST_NAME';
  end if;
  if exists (select 1 from public.lms_learners where phone = p_phone) then
    raise exception 'PHONE_EXISTS';
  end if;

  full_name := public.lms_full_name(p_first_name, p_last_name);

  insert into public.lms_learners (phone, name, first_name, last_name)
  values (p_phone, full_name, trim(p_first_name), trim(p_last_name))
  returning * into result;
  return result;
end;
$$;

-- OTP ensure learner with first + last name on signup
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
  full_name text;
begin
  uid := auth.uid();
  if p_phone is null or length(trim(p_phone)) < 10 then
    raise exception 'INVALID_PHONE';
  end if;

  select * into result from public.lms_learners where phone = p_phone;

  if result is not null then
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

grant execute on function public.lms_update_learner_profile(uuid, text, text, text, text, text) to anon, authenticated;

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
  admin_id uuid;
begin
  admin_id := public.lms_assert_admin_auth();

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
  where id = admin_id
  returning * into result;

  return result;
end;
$$;

grant execute on function public.lms_admin_update_profile(text, text, text, text, text) to authenticated;
