-- Staff self-signup: instructors activate immediately; admins require approval

alter table public.lms_admins
  add column if not exists status text not null default 'active'
    check (status in ('active', 'pending')),
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.lms_admins(id) on delete set null;

-- Existing rows stay active
update public.lms_admins set status = 'active' where status is null;

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
  if not exists (
    select 1 from public.lms_admins
    where id = staff_id and status = 'active'
  ) then
    raise exception 'FORBIDDEN';
  end if;
  return staff_id;
end;
$$;

create or replace function public.lms_assert_active_admin_auth()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid;
begin
  admin_id := public.lms_assert_staff_auth();
  if not exists (
    select 1 from public.lms_admins
    where id = admin_id and role = 'admin'
  ) then
    raise exception 'FORBIDDEN';
  end if;
  return admin_id;
end;
$$;

-- Called right after Supabase Auth sign-up (authenticated JWT required)
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
  staff_status text;
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

  staff_status := case when p_role = 'admin' then 'pending' else 'active' end;

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
    staff_status
  )
  returning * into result;

  return result;
end;
$$;

create or replace function public.lms_admin_list_pending_staff()
returns table (
  id uuid,
  email text,
  name text,
  first_name text,
  last_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.lms_assert_active_admin_auth();
  return query
  select a.id, a.email, a.name, a.first_name, a.last_name, a.created_at
  from public.lms_admins a
  where a.role = 'admin' and a.status = 'pending'
  order by a.created_at asc;
end;
$$;

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
    and role = 'admin'
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
    and role = 'admin'
    and status = 'pending';

  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

grant execute on function public.lms_register_staff(text, text, text) to authenticated;
grant execute on function public.lms_assert_active_admin_auth() to authenticated;
grant execute on function public.lms_admin_list_pending_staff() to authenticated;
grant execute on function public.lms_admin_approve_staff(uuid) to authenticated;
grant execute on function public.lms_admin_reject_staff(uuid) to authenticated;
