-- Hotfix: assignments list must not be callable by anon/public.
-- Run in Supabase SQL Editor after audit_fixes if anon can still list assignments.

revoke execute on function public.lms_list_assignments() from public;
revoke execute on function public.lms_list_assignments() from anon;
grant execute on function public.lms_list_assignments() to authenticated;
