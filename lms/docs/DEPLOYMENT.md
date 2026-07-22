# Deploying the LMS — complete walkthrough

This guide assumes you are on **Windows**, using **PowerShell**, and deploying to **https://learn.myhandwork.ng**.

---

## The big picture (read this first)

The LMS is **not** a traditional server app you “run” with PM2 on the VPS. Here is what actually happens:

1. On **your PC**, you run `npm run build`. That compiles the React app into plain files: HTML, CSS, JavaScript. They land in the folder `lms/dist/`.
2. You **copy** everything inside `lms/dist/` to a folder on Grace’s server (user `lmsuser`).
3. The **web server** (nginx, configured by Grace) serves those files when someone visits `learn.myhandwork.ng`.
4. **Supabase** (login, database, SMS) stays in the cloud. The VPS only hosts the website files. Your Supabase URL and keys are baked into the build via `lms/.env`.

So each deploy is: **configure `.env` → build → upload `dist/` → check the site**.

---

## What you already have (from Grace)

| Item | Value |
|------|--------|
| SSH username | `lmsuser` |
| Server IP | `198.177.123.227` |
| Live website URL | `https://learn.myhandwork.ng` |
| How you log in | **SSH key only** (not the password from WhatsApp) |
| Where files go | `/home/lmsuser/public_html/` (upload target) |
| **Important** | HTTPS nginx must serve that same folder — see **Phase 6.3** if the live site shows an old build |

Your SSH key should already be on the server. The private key on your PC is:

`C:\Users\DELL\.ssh\nerdzfactory_lms`

---

## Phase 0 — One-time prerequisites

Do these once before your first deploy.

### 0.1 — Node.js installed

Open PowerShell and run:

```powershell
node -v
npm -v
```

You should see version numbers (e.g. `v20.x` and `10.x`). If not, install Node from https://nodejs.org (LTS).

### 0.2 — SSH key exists

```powershell
Test-Path "$env:USERPROFILE\.ssh\nerdzfactory_lms"
```

Should print `True`. If `False`, see **Part 1** at the bottom of this doc to generate a key and send the `.pub` file to Grace again.

### 0.3 — Supabase is set up

- Migrations run in Supabase SQL Editor (see `SUPABASE_SETUP.md`).
- SMS / Termii configured if you use phone OTP (see `EMAILS_AND_PHONE_SETUP.md`).

### 0.4 — Know your Supabase keys

1. Open https://supabase.com/dashboard → your LMS project.
2. Go to **Project Settings** → **API**.
3. Copy:
   - **Project URL** → use as `VITE_SUPABASE_URL`
   - **anon public** key → use as `VITE_SUPABASE_ANON_KEY`

You will paste these into `lms/.env` before every production build.

---

## Phase 1 — Confirm you can SSH into the server

This proves your key works **before** you try to upload files.

### Step 1.1 — Open PowerShell

Press `Win + X` → **Terminal** or **PowerShell**.

### Step 1.2 — Connect

Copy and paste this entire line, then press Enter:

```powershell
ssh -i "$env:USERPROFILE\.ssh\nerdzfactory_lms" lmsuser@198.177.123.227
```

**What each part means:**

- `ssh` — secure shell, remote login
- `-i "$env:USERPROFILE\.ssh\nerdzfactory_lms"` — use your private key file
- `lmsuser@198.177.123.227` — log in as user `lmsuser` on that IP

### Step 1.3 — First-time fingerprint

If it asks `Are you sure you want to continue connecting (yes/no)?`, type `yes` and Enter.

### Step 1.4 — Success vs failure

**Success:** You see a Linux prompt like `lmsuser@something:~$`. You are on the server.

**Failure:** `Permission denied (publickey)` — Grace has not installed your public key correctly. Send Grace:

> SSH still fails with Permission denied. Please add this line to `/home/lmsuser/.ssh/authorized_keys`:

Then paste the output of:

```powershell
Get-Content "$env:USERPROFILE\.ssh\nerdzfactory_lms.pub"
```

### Step 1.5 — Find where to upload files

While still logged in via SSH, run:

```bash
pwd
ls -la
```

- `pwd` prints your home directory (usually `/home/lmsuser`).
- `ls -la` lists folders. Look for names like `public_html`, `www`, `learn.myhandwork.ng`, or `htdocs`.

**Write down the folder name** — that is your **deploy folder**. If you only see empty home or are unsure, type `exit` to leave SSH and ask Grace:

> Which folder under `/home/lmsuser` should I upload the website files to for learn.myhandwork.ng?

For the rest of this guide we use **`public_html`** as the example. Replace it with whatever Grace or `ls` showed you.

### Step 1.6 — Leave the server

```bash
exit
```

You are back on your PC.

---

## Phase 2 — Prepare production settings on your PC

The build reads `lms/.env`. Those values are **embedded** in the JavaScript — they are not secret server env vars.

### Step 2.1 — Open the env file

In Cursor or Notepad, open:

`C:\Users\DELL\Desktop\CODE\NerdzFactory\nerdzfactory.co\lms\.env`

### Step 2.2 — Set these variables

Use your real Supabase values. Example shape:

```env
VITE_SUPABASE_URL=https://ifkviqlzhdsaovozlbqd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_USE_SUPABASE_AUTH=true
VITE_USE_SUPABASE_DATA=true
VITE_USE_PHONE_OTP=true
```

| Variable | Meaning |
|----------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key (safe in frontend) |
| `VITE_USE_SUPABASE_AUTH=true` | Real login (not demo mode) |
| `VITE_USE_SUPABASE_DATA=true` | Courses/learners from database |
| `VITE_USE_PHONE_OTP=true` | SMS codes for learners (if Termii is live) |

Save the file. **Never commit `.env` to git.**

---

## Phase 3 — Build the website on your PC

This creates the `dist/` folder you will upload.

### Step 3.1 — Go to the LMS folder

```powershell
cd C:\Users\DELL\Desktop\CODE\NerdzFactory\nerdzfactory.co\lms
```

### Step 3.2 — Install dependencies (first time or after package changes)

```powershell
npm install
```

Wait until it finishes with no errors.

### Step 3.3 — Run the production build

```powershell
npm run build
```

Wait until you see something like `built in Xs` and **no red errors**.

### Step 3.4 — Confirm `dist/` exists

```powershell
Get-ChildItem .\dist
```

You should see `index.html`, an `assets` folder, and other files. **You upload the contents of `dist`, not the `dist` folder itself as a single item** — the commands below handle that.

### Step 3.5 — Optional: preview on your PC

```powershell
npm run preview
```

Open http://localhost:4173 in your browser. Sign-in and flows should work against Supabase. Stop preview with `Ctrl+C` when done.

---

## Phase 4 — Upload files to the server

**Use the deploy script — it does everything (build, upload, permissions, verify):**

```powershell
cd C:\Users\DELL\Desktop\CODE\NerdzFactory\nerdzfactory.co\lms
.\scripts\deploy.ps1
```

Do NOT scp straight into the webroot: scp from Windows recreates folders with
`700` permissions, which locks nginx out and causes a blank page (404 on all
assets). The script uploads to a staging folder first, then publishes with
rsync and correct permissions in one step.

The manual steps below are kept for reference only.

You copy from `lms\dist\` on your PC to the deploy folder on the server.

### Step 4.1 — Use the correct deploy path

Replace `public_html` below if Grace gave you a different folder.

### Step 4.2 — Upload command

Run this in PowerShell (still in the `lms` folder, or use full paths):

```powershell
scp -i "$env:USERPROFILE\.ssh\nerdzfactory_lms" -r "C:\Users\DELL\Desktop\CODE\NerdzFactory\nerdzfactory.co\lms\dist\*" lmsuser@198.177.123.227:public_html/
```

**What this does:**

- `scp` — secure copy (like FTP but over SSH)
- `-r` — copy recursively (all files and subfolders)
- `dist\*` — everything **inside** `dist`
- `lmsuser@198.177.123.227:public_html/` — destination on the server

The upload may take 30 seconds to a few minutes depending on connection speed.

### Step 4.3 — If the folder does not exist yet

SSH in and create it:

```powershell
ssh -i "$env:USERPROFILE\.ssh\nerdzfactory_lms" lmsuser@198.177.123.227
```

Then on the server:

```bash
mkdir -p public_html
exit
```

Run the `scp` command again.

### Step 4.4 — Verify files on the server

```powershell
ssh -i "$env:USERPROFILE\.ssh\nerdzfactory_lms" lmsuser@198.177.123.227 "ls -la public_html"
```

You should see `index.html` and `assets` (or similar).

---

## Phase 5 — Configure Supabase for the live URL

Supabase must allow redirects to your production domain.

### Step 5.1 — Open Supabase Auth settings

Dashboard → **Authentication** → **URL configuration**.

### Step 5.2 — Set Site URL

```
https://learn.myhandwork.ng
```

### Step 5.3 — Add Redirect URLs

Add these (one per line if the UI uses a list):

```
https://learn.myhandwork.ng
https://learn.myhandwork.ng/**
https://learn.myhandwork.ng/admin/reset-password
```

Save.

Without this, password reset and some auth flows may fail on the live site even if the files uploaded correctly.

---

## Phase 6 — Test the live site

### Step 6.1 — Open the site

In your browser go to:

**https://learn.myhandwork.ng**

### Step 6.2 — Check these pages

| URL | What to check |
|-----|----------------|
| `/login` | Learner sign-in page loads, image on the left |
| `/admin/login` | Staff sign-in loads |
| Sign in as learner | Dashboard, courses |
| Sign in as staff | Courses / assignments admin |

### Step 6.3 — Common problems

| Symptom | Likely cause |
|---------|----------------|
| Blank page or 404 on `/login` | nginx not serving `index.html` for all routes — ask Grace to add `try_files $uri $uri/ /index.html;` |
| Site shows old version after `scp` | **Wrong nginx folder for HTTPS** — uploads go to `public_html`, but nginx may still serve `/var/www/html/learn.myhandwork.ng/`. Ask Grace to set the SSL `root` in `/etc/nginx/conf.d/learn.myhandwork.ng.conf` to `/home/lmsuser/public_html/` and reload nginx. Then purge Cloudflare cache if needed. |
| Site shows old version | Browser cache — hard refresh (`Ctrl+Shift+R`) or incognito |
| Login fails / network errors | Wrong `VITE_SUPABASE_*` in `.env` — fix, **rebuild**, re-upload |
| SMS not working | Termii / Edge Function — see `EMAILS_AND_PHONE_SETUP.md`, not the VPS |

---

## Phase 7 — When you change the app later (redeploy)

Every time you update code:

1. Edit code on your PC.
2. If Supabase settings changed, update `lms/.env`.
3. `cd` to `lms` folder.
4. `npm run build`
5. Run the same `scp` command from Phase 4.
6. Hard-refresh the browser on `learn.myhandwork.ng`.

You do **not** need to run PM2 or Node on the server for the LMS frontend.

---

## Part 1 — SSH key setup (only if you do not have a key yet)

### Create the `.ssh` folder

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.ssh"
```

### Generate a key pair

```powershell
ssh-keygen -t ed25519 -C "emmanuel-nerdzfactory-lms" -f "$env:USERPROFILE\.ssh\nerdzfactory_lms" -N '""'
```

- **Private key** (never share): `C:\Users\DELL\.ssh\nerdzfactory_lms`
- **Public key** (send to Grace): `C:\Users\DELL\.ssh\nerdzfactory_lms.pub`

### Show public key to send to Grace

```powershell
Get-Content "$env:USERPROFILE\.ssh\nerdzfactory_lms.pub"
```

---

## Before first go-live checklist

| Task | Where |
|------|--------|
| All SQL migrations | Supabase SQL Editor — `lms/supabase/migrations/` in date order |
| Send SMS hook + Termii | [EMAILS_AND_PHONE_SETUP.md](./EMAILS_AND_PHONE_SETUP.md) Part B |
| OTP 10 minutes | `npm run supabase:otp-expiry` |
| Deploy SMS function | `npm run supabase:deploy-sms` |
| Auth redirect URLs | Supabase → Authentication → URL configuration |

---

## Quick command reference

| What | Command |
|------|---------|
| **Deploy (build + upload + verify)** | `cd C:\Users\DELL\Desktop\CODE\NerdzFactory\nerdzfactory.co\lms` then `.\scripts\deploy.ps1` |
| Deploy without rebuilding | `.\scripts\deploy.ps1 -SkipBuild` |
| SSH in | `ssh -i "$env:USERPROFILE\.ssh\nerdzfactory_lms" lmsuser@198.177.123.227` |
| List server home | `ssh -i "$env:USERPROFILE\.ssh\nerdzfactory_lms" lmsuser@198.177.123.227 "ls -la"` |
| Show public key | `Get-Content "$env:USERPROFILE\.ssh\nerdzfactory_lms.pub"` |

---

## Security reminders

- Never share `nerdzfactory_lms` (the file **without** `.pub`).
- Never commit `lms/.env` to git.
- Termii and service-role secrets live in **Supabase**, not on the VPS.
