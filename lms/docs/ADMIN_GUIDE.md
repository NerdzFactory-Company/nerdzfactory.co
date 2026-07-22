# Admin guide — NerdzFactory Learning

This guide is for **staff** who manage courses and learners. Technical setup (database, email templates, SMS) lives in the other docs in this folder — not in the website.

## Sign in

- **Staff:** [your-lms-url]/admin/login — email and password
- **Learners:** [your-lms-url]/login — phone number only

### New staff accounts

From **Staff sign in**, choose:

- **Sign up as instructor** — active immediately; can edit courses, review assignment submissions, and view learners
- **Sign up as admin** — must be **approved** by an existing admin on the **Overview** tab before you can sign in

Instructors and admins both use the same staff login page after their account is active.

## Admin dashboard

After sign-in you land on **Overview** (admins only) or **Courses** (instructors), which shows:

- How many courses, lessons, and learners you have
- Quick actions to add a course or open the learner dashboard
- Every course with **Preview as learner** and **Edit**
- Recent learner sign-ups
- **Admin access requests** (admins only) — approve or decline people who signed up as admin

Use the tabs: **Overview · Courses · Assignments · Learners**

## View courses as a learner

Learners never see the admin editor. To check what they will see:

1. **Overview** or **Courses** → click **View as learner**
2. You open the same course homepage and video player learners use
3. A gold banner at the top says **Viewing as a learner** — click **Back to admin** when done

You can also open **My courses** in the header to see the main course list.

## Manage courses

1. **New course** — fill in basics, homepage content, then add videos with YouTube links
2. **Upload images** — add a thumbnail and banner on the Basics tab, or leave the thumbnail blank to use the first video’s preview image
3. **Draft vs Live** — unpublished courses are hidden from learners
4. **Edit** — change any time; use **View as learner** before publishing

## Learners

**Learners** lists everyone who signed up with a phone number. For each person you can:

- See overall progress across all courses
- Click **View profile** for their full details (bio, job title, location) and a video-by-video breakdown of what they have completed in each course

## Who handles technical setup?

| Task | Who | Where to read |
|------|-----|----------------|
| First-time database setup | Developer | [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) |
| Branded password-reset emails | Developer | [EMAILS_AND_PHONE_SETUP.md](./EMAILS_AND_PHONE_SETUP.md) |
| SMS phone codes for learners | Developer | [EMAILS_AND_PHONE_SETUP.md](./EMAILS_AND_PHONE_SETUP.md) — Part B |
| Day-to-day course content | Staff (you) | This guide |
