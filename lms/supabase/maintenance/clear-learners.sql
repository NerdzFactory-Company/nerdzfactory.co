-- ONE-TIME CLEANUP — deletes ALL learner accounts that exist right now.
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
--
-- What it removes:
--   * every row in lms_learners
--   * their course progress (lms_progress cascades)
--   * their assignment submissions (lms_assignment_submissions cascades)
--   * their Supabase Auth accounts (phone sign-ins)
-- What it does NOT touch:
--   * staff accounts (lms_admins and their auth users)
--   * courses, lessons, assignments, email templates, site images

begin;

-- 1. Delete the learners' auth accounts (never staff accounts)
delete from auth.users u
using public.lms_learners l
where l.auth_user_id = u.id
  and l.created_at < now()
  and not exists (select 1 from public.lms_admins a where a.id = u.id);

-- 2. Delete learner rows — progress and submissions cascade automatically
delete from public.lms_learners
where created_at < now();

commit;

-- Should both return 0
select
  (select count(*) from public.lms_learners) as remaining_learners,
  (select count(*) from public.lms_progress) as remaining_progress;
