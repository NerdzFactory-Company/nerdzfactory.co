-- Quick publish / unpublish without re-saving the full course editor form.

create or replace function public.lms_admin_set_course_published(
  p_id text,
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

grant execute on function public.lms_admin_set_course_published(text, boolean) to anon, authenticated;
