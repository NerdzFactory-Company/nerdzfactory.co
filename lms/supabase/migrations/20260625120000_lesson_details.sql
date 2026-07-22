-- Extra lesson / video fields for admins and learners

alter table public.lms_lessons
  add column if not exists prerequisites text not null default '',
  add column if not exists objectives jsonb not null default '[]'::jsonb,
  add column if not exists key_takeaways jsonb not null default '[]'::jsonb,
  add column if not exists resources jsonb not null default '[]'::jsonb;

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
  p_resources jsonb default '[]'::jsonb
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
  insert into public.lms_lessons (
    id, course_id, title, description, video_url, duration, sort_order,
    prerequisites, objectives, key_takeaways, resources
  )
  values (
    p_id, p_course_id, p_title, p_description, p_video_url, p_duration, p_sort_order,
    coalesce(p_prerequisites, ''),
    coalesce(p_objectives, '[]'::jsonb),
    coalesce(p_key_takeaways, '[]'::jsonb),
    coalesce(p_resources, '[]'::jsonb)
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
    resources = excluded.resources
  returning * into result;
  return result;
end;
$$;

grant execute on function public.lms_admin_upsert_lesson(
  text, text, text, text, text, text, int, text, jsonb, jsonb, jsonb
) to authenticated;
