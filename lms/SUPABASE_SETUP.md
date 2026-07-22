# Supabase setup for NerdzFactory Learning (LMS)

## Quick links

| Task | Guide |
|------|--------|
| **Customize password reset, confirm signup, etc.** | [docs/EMAILS_AND_PHONE_SETUP.md](./docs/EMAILS_AND_PHONE_SETUP.md) — Part A |
| **Phone SMS sign-in for learners** | [docs/EMAILS_AND_PHONE_SETUP.md](./docs/EMAILS_AND_PHONE_SETUP.md) — Part B |
| **Staff admin (courses, learners, preview)** | [docs/ADMIN_GUIDE.md](./docs/ADMIN_GUIDE.md) |
| **Deploy frontend to VPS subdomain** | [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) |
| Database migrations | Below |

## 1. Environment

```env
VITE_SUPABASE_URL=https://ifkviqlzhdsaovozlbqd.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
# VITE_USE_PHONE_OTP=true   # after Termii Send SMS hook is deployed (see docs)
```

## 2. Migrations (run in order in SQL Editor)

1. `supabase/migrations/20260618120000_lms_tables.sql`
2. `supabase/migrations/20260619120000_admin_auth_course_emails.sql`
3. `supabase/migrations/20260620120000_phone_otp_and_auth_emails.sql`
4. `supabase/migrations/20260621120000_supabase_email_templates_branded.sql`
5. `supabase/migrations/20260622120000_learner_profile.sql`
6. `supabase/migrations/20260623120000_lms_media_storage.sql`
7. `supabase/migrations/20260624120000_otp_purpose_pending.sql` — correct sign-up vs password-reset SMS text
8. `supabase/migrations/20260625120000_lesson_details.sql` — extra fields per lesson/video
9. `supabase/migrations/20260626120000_assignments_and_instructors.sql` — worksheets & instructor role
10. `supabase/migrations/20260627120000_staff_signup.sql` — staff self-signup & admin approval
11. `supabase/migrations/20260628120000_mock_assignment_submissions.sql` — sample submissions for testing (optional; removed again by the security hardening migration)
12. `supabase/migrations/20260708120000_site_images.sql` — admin Media tab (site-wide images)
13. `supabase/migrations/20260715120000_lms_media_videos.sql` — lesson video uploads (bucket allows video files)
14. `supabase/migrations/20260716120000_lesson_thumbnails_and_reorder.sql` — lesson thumbnails & ordering
15. `supabase/migrations/20260717120000_image_upload_20mb.sql` — 20 MB image upload limit
16. `supabase/migrations/20260718120000_course_publish_toggle.sql` — quick publish/unpublish RPC
17. `supabase/migrations/20260719120000_courses_rls_unpublished.sql` — hide unpublished courses from the public API
18. `supabase/migrations/20260720120000_security_hardening.sql` — **required**: locks down learner/progress data (RLS), adds ownership checks, drops legacy anon-callable RPCs, deletes mock demo learners
19. `supabase/migrations/20260722120000_assignment_submit_hardening.sql` — **required**: reliable worksheet submit (auto-links learner session) and clearer submit errors
20. `supabase/migrations/20260722130000_audit_fixes.sql` — **required**: instructor approval, admin vs staff RPCs, submission lock, assignment seed for learners, phone normalize, batch submission helpers, revoke anon assignment list
21. `supabase/migrations/20260722140000_revoke_anon_assignments.sql` — **required** if step 20 ran before the PUBLIC revoke fix: revoke assignment list from public/anon
22. `supabase/migrations/20260722150000_assignment_level_lock.sql` — **required**: lock whole worksheet (even with zero submissions)

## 3. First admin (one-time bootstrap)

You need **one** admin before anyone can approve other admin sign-ups.

1. Supabase → Authentication → Users → Add user (email + password)
2. SQL:

```sql
insert into public.lms_admins (id, email, name, role, status)
select id, email, coalesce(raw_user_meta_data->>'name', email), 'admin', 'active'
from auth.users where email = 'your@email.com'
on conflict (id) do nothing;
```

3. Sign in at `/admin/login`

After that, additional staff can sign up from the website (see below).

## 4. Staff sign-up (instructors & admins)

| Role | URL | What happens |
|------|-----|----------------|
| **Instructor** | `/admin/signup/instructor` | Account is active immediately — can sign in and manage courses, assignments, learners |
| **Admin** | `/admin/signup/admin` | Request is **pending** until an existing admin approves it on **Overview** |

Links are also on the **Staff sign in** page (`/admin/login`).

## 5. Assignments (worksheets)

Worksheets live in `lms/worksheets/` as HTML files. The app turns them into assignment forms automatically.

- **First time:** open **Staff → Assignments** in the app — it loads the 10 worksheets into the database.
- **After editing worksheet HTML:** run `npm run build:assignments` in the `lms` folder, redeploy the app, then open **Staff → Assignments** again to sync changes.

You do **not** need to run SQL or insert rows by hand for assignments.

## 6. Sign-in methods

| Who | URL | Method |
|-----|-----|--------|
| Learners | `/login` | Phone (+ SMS code if OTP enabled) |
| Staff | `/admin/login` | Email + password |

## 7. Customize Supabase auth emails

Copy branded templates from the database or `src/content/supabaseEmailTemplates.ts` into  
[Supabase Auth Templates](https://supabase.com/dashboard/project/ifkviqlzhdsaovozlbqd/auth/templates)

See **docs/EMAILS_AND_PHONE_SETUP.md** (staff use **docs/ADMIN_GUIDE.md** for day-to-day admin).
