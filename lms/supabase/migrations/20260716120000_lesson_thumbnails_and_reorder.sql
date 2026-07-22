-- Per-lesson video preview image (captured from middle of uploaded videos)
alter table public.lms_lessons
  add column if not exists thumbnail_url text not null default '';

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
  perform public.lms_assert_admin_auth();
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

grant execute on function public.lms_admin_upsert_lesson(
  text, text, text, text, text, text, int, text, jsonb, jsonb, jsonb, text
) to authenticated;

-- Batch-update course display order on the learner homepage
create or replace function public.lms_admin_reorder_courses(p_orders jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  perform public.lms_assert_admin_auth();
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

grant execute on function public.lms_admin_reorder_courses(jsonb) to authenticated;
