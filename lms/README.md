# NerdzFactory Learning (LMS)

A standalone learning platform for NerdzFactory training programs — matching the branding of [nerdzfactory.co](https://nerdzfactory.co).

## Features

- **Phone-only auth** — sign up with name + phone, sign in with phone (no passwords)
- **Course progress tracking** — per-lesson completion with visual progress rings and bars
- **Admin panel** — manage courses, lessons, learners, and roles
- **Supabase backend** — cloud storage for learners, courses, and progress
- **Mobile-first UI** — large touch targets for non-tech-savvy learners

## Quick start

```bash
cd lms
npm install
cp .env.example .env.local   # add your Supabase anon key
npm run dev
```

Open [http://localhost:5174](http://localhost:5174).

See **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** for database migration and admin setup.

## Admin panel

After promoting your account to `admin` in Supabase, visit `/admin` to:

- Create and edit courses
- Add YouTube lesson videos
- View learner progress
- Promote other users to admin

## Build for production

```bash
npm run build
npm run preview
```
