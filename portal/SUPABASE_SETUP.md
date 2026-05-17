# Supabase setup for the NerdzFactory portal

This guide is for someone **new to Supabase** who wants to **go live** with real auth and data. The portal today uses **mock login** + **localStorage**. Supabase replaces those with hosted **Auth**, **Postgres**, and optional **Realtime**.

---

## 1. What Supabase gives you (simple mental model)

| Piece | What it is | In this portal |
|--------|------------|----------------|
| **Project** | Your cloud “backend app” | One project for production (and one free dev project is fine) |
| **API URL + anon key** | Public config the browser uses | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| **Auth** | Sign-up, login, sessions (JWT) | Replace mock `AuthContext` + `seedUsers` passwords |
| **Database (Postgres)** | Tables for tasks, notes, profiles … | Replace `DataContext` + `CollabContext` localStorage |
| **Row Level Security (RLS)** | Who can read/write which rows | **Required** so users only see their org’s data |
| **Realtime** | Live subscriptions (presence, broadcast) | Replace / harden today’s `CollabContext` channel |

The **anon key is safe in the browser** only if **RLS policies** enforce access. Never put the **service_role** key in the frontend.

---

## 2. Create your Supabase account and project

1. Go to [https://supabase.com](https://supabase.com) → **Start your project** → sign up (GitHub or email).
2. Click **New project**.
3. Choose **Organization** (default is fine).
4. **Name**: e.g. `nerdzfactory-portal`.
5. **Database password**: generate a strong one and **save it** (password manager). You rarely type it; the dashboard uses it internally.
6. **Region**: choose closest to your users (e.g. Europe / US).
7. Wait until the project shows **Healthy**.

### Get the two values the Vite app needs

1. In the Supabase dashboard: **Project Settings** (gear) → **API**.
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Project API keys** → **anon public** → `VITE_SUPABASE_ANON_KEY`

3. In the portal folder, copy `.env.example` to `.env.local` and paste both values:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. Restart `npm run dev` after changing env files.

With only these set, **today’s code** already uses Supabase for **Realtime** (notes broadcast + presence) when the URL and anon key exist. Auth and Postgres are still **not** wired to every screen—that’s the migration work below.

---

## 3. Authentication (replace mock login)

### 3.1 Turn on Email auth (simplest for staff portal)

1. Dashboard: **Authentication** → **Providers**.
2. **Email** → enable **Email** (and optionally **Confirm email** for production).
3. **URL configuration** (Authentication → **URL Configuration**):
   - **Site URL**: your production portal origin, e.g. `https://portal.nerdzfactory.com`
   - **Redirect URLs**: add the same + `http://localhost:5173/**` for local dev.

### 3.2 What you implement in the app (high level)

1. Install auth helper (optional but nice): `@supabase/auth-ui-react` **or** use `supabase.auth.signInWithPassword` / `signUp` from `src/lib/supabase.ts`.
2. Replace `AuthContext` so that:
   - On load, call `supabase.auth.getSession()` and store the **session user** (id, email, metadata).
   - **Do not** store passwords in `localStorage`; Supabase keeps the session in **secure** storage by default.
3. Map Supabase `user.id` to your **profile** row (see §4) for `name`, `role`, `department`, etc.

### 3.3 Invite-only / no public sign-up (common for internal portals)

1. Authentication → **Providers** → disable public sign-up if the UI allows, **or** keep sign-up off and create users from the dashboard: **Authentication** → **Users** → **Add user**.
2. Optionally use **Magic Link** only (passwordless) for less support burden.

---

## 4. Database: tables that match the portal (migration map)

Today, `DataContext` + `CollabContext` hold roughly:

| Area | Suggested table(s) | Notes |
|------|----------------------|--------|
| Staff profile | `profiles` | `id` = `auth.users.id`, `role`, `department`, `name`, … |
| Tasks | `tasks` | RLS: org or `assignee_id` / `owner_id` |
| Weekly check-ins | `weekly_check_ins` | RLS: `user_id = auth.uid()` |
| Announcements | `announcements` | RLS: read by audience rules |
| Leave | `leave_requests` | RLS: own rows + HR role |
| Documents | `documents` | RLS: department / role |
| Recognition | `recognition_posts` | RLS: workspace members |
| Events | `events` | RLS: read for all staff |
| Workspace notes | `workspace_notes` | RLS: match `share` JSON rules or normalized columns |
| Teams | `workspace_teams` + `workspace_team_members` | For note sharing by team |

You do **not** need all tables on day one. A practical go-live order:

1. **`profiles`** + trigger on signup (see Supabase docs: “Handle new user”).
2. **`workspace_notes`** (if notes are critical) **or** **`tasks`**—pick the feature that matters most.
3. Add the rest incrementally.

### 4.1 Example: `profiles` table (SQL Editor)

Dashboard → **SQL** → **New query**:

```sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text not null,
  role text not null default 'staff',
  department text,
  job_title text,
  avatar_url text,
  active boolean not null default true,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read profiles in their org"
  on public.profiles for select
  using (true); -- tighten later, e.g. same tenant_id

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);
```

**Tighten policies** before production (e.g. tenant id, HR can update others).

---

## 5. Row Level Security (RLS) — fixes only Supabase can fully solve

These **cannot** be solved only in React; the database must enforce them.

| Issue | Why | What to do in Supabase |
|--------|-----|-------------------------|
| Users seeing other companies’ data | Anon key is public | Add `org_id` (or `tenant_id`) to tables; `using (org_id = (select org_id from profiles where id = auth.uid()))` |
| “Admin” route security | SPA checks are cosmetic | Store `role` in `profiles`; RLS policies `using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','hr')))` for elevated operations |
| Note share links | Client-only tokens are guessable / forgeable | Store notes in `workspace_notes`; validate **read** with RLS: `auth.uid()` in allowed list, or signed **one-time** tokens via Edge Function |
| Realtime cross-tenant leak | Shared channel name | Use **private** channels: `supabase.channel('room:' || note_id)` with **RLS** on `realtime.messages` (newer) or authorize channel join in **database** / **Edge Function** |

**Steps (pattern):**

1. Enable RLS on every table: `alter table … enable row level security;`
2. Add `select` / `insert` / `update` / `delete` policies using `auth.uid()`.
3. Test with two test users in **SQL** or Table Editor “View as user” (if available) or two browsers.

---

## 6. Realtime (notes + presence) — production-hardening

Today the app uses a **broadcast** channel when Supabase is configured.

**Improvements in Supabase:**

1. **Authentication**: Only authenticated users subscribe (pass JWT to Realtime).
2. **Private channels**: Name channels per note or per org; use [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization) as your project supports it.
3. **Replace broadcast with Postgres changes** (optional): `postgres_changes` on `workspace_notes` so edits persist from DB and all tabs stay in sync.

**Steps:**

1. Dashboard → **Database** → **Replication** → enable replication for `workspace_notes` if you use `postgres_changes`.
2. In code: subscribe with `filter` on `id=eq.note_id` and RLS so users only get rows they can read.

---

## 7. Going live checklist (minimal)

- [ ] Production Supabase project created; **backups** considered (paid plan for production).
- [ ] **Auth** redirect URLs include production domain.
- [ ] `.env` / hosting dashboard: **`VITE_*`** vars set on build host (Vercel/Netlify/etc.).
- [ ] **RLS** enabled and tested on all public tables.
- [ ] Remove or **hide** demo login quick-fill on production build (env flag).
- [ ] **HTTPS** only on portal; cookies / auth require it.
- [ ] **Service role** key only in server/Edge Functions — never in Vite bundle.

---

## 8. How this portal ties together (simplest path)

1. **Week 1 – Auth + profiles**  
   Supabase Auth login → `profiles` row → `AuthContext` reads profile from Supabase instead of mock.

2. **Week 2 – One domain**  
   e.g. **Notes**: `workspace_notes` table + RLS + replace `CollabContext` localStorage with `supabase.from('workspace_notes').select/upsert`.

3. **Week 3+**  
   Repeat for tasks, announcements, leave, etc., reusing the same **org_id + RLS** pattern.

4. **Realtime**  
   Either keep current broadcast for “good enough” internal use, or move to **Realtime + Postgres** for authoritative sync.

---

## 9. Helpful Supabase docs (bookmark)

- [Getting started](https://supabase.com/docs/guides/getting-started)
- [Auth](https://supabase.com/docs/guides/auth)
- [RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime](https://supabase.com/docs/guides/realtime)
- [Vite + Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)

---

## 10. Support inside this repo

- **Env template**: `.env.example`
- **Supabase client**: `src/lib/supabase.ts`
- **Collab / notes today**: `src/context/CollabContext.tsx`

For schema design specific to NerdzFactory (exact columns + policies), iterate with your team or AI using `src/types/index.ts` and `DataContext` shapes as the source of truth.
