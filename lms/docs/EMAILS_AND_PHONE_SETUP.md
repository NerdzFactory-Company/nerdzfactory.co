# Supabase emails & phone sign-in — setup guide

> **Note:** Email template editing is not in the LMS website. This document lives in the repo (`lms/docs/EMAILS_AND_PHONE_SETUP.md`) for developers and administrators setting up the platform.

This guide explains **two things**:

1. How to customize the **real emails Supabase sends** (password reset, confirm signup, etc.)
2. How to let **learners sign in with their phone number** using SMS codes (OTP)

Your project: [ifkviqlzhdsaovozlbqd](https://supabase.com/dashboard/project/ifkviqlzhdsaovozlbqd)

---

## Part A — Customize Supabase authentication emails

Supabase sends auth emails from its own mail system (or your custom SMTP).  
**The LMS admin panel cannot push templates to Supabase automatically** — you design them in the app, then paste them into the Supabase dashboard.

### Step 1 — Open email templates in Supabase

1. Go to [Authentication → Emails → Templates](https://supabase.com/dashboard/project/ifkviqlzhdsaovozlbqd/auth/templates)
2. You will see these templates (customize **all** of them for a consistent brand):

| Supabase template name | When it is sent |
|------------------------|-----------------|
| **Confirm signup** | New admin confirms their email |
| **Invite user** | You invite someone from Authentication → Users |
| **Magic Link** | Passwordless email sign-in link |
| **Change Email Address** | User changes their email |
| **Reset Password** | “Forgot password” on admin login |
| **Reauthentication** | Extra verification when required |

### Step 2 — Get the HTML from the project (not the website)

Email templates are stored in the database and in source files — they are **not** edited in the LMS admin UI.

1. Run migration `supabase/migrations/20260621120000_supabase_email_templates_branded.sql` in the Supabase SQL Editor (if you have not already).
2. Open `src/content/supabaseEmailTemplates.ts` for the canonical HTML and subjects, **or** query the database:

```sql
select id, supabase_template_key, supabase_subject, supabase_body_html
from public.lms_email_templates
where sync_to_supabase_auth = true
order by name;
```

3. Copy each **subject** and **body HTML** into the matching Supabase dashboard template.

### Step 3 — Supabase variables (important)

In Supabase templates, use **their** syntax, not `{{name}}`:

| Supabase variable | Meaning |
|-------------------|---------|
| `{{ .ConfirmationURL }}` | Confirm email, reset password, magic link, invite |
| `{{ .Token }}` | 6-digit OTP (if using token in email) |
| `{{ .TokenHash }}` | Hashed token |
| `{{ .SiteURL }}` | Your site URL from Auth settings |
| `{{ .Email }}` | User’s email address |
| `{{ .NewEmail }}` | New address (change email template) |
| `{{ .RedirectTo }}` | Redirect after clicking the link |

**Example — Confirm signup (HTML):**

```html
<h2>Confirm your email address</h2>
<p>Follow the link below to confirm this email address and finish signing up.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm email address</a></p>
```

Branded versions for all six Supabase auth templates are seeded in migration
`lms/supabase/migrations/20260621120000_supabase_email_templates_branded.sql`.
Run it in the SQL Editor, then copy from **Admin → Emails** into each Supabase template.

**Example — Reset password (HTML):**

```html
<h2 style="color:#0B1120;font-family:Montserrat,sans-serif;">Reset your password</h2>
<p style="font-family:Montserrat,sans-serif;">Click the link below to set a new password for NerdzFactory Learning:</p>
<p><a href="{{ .ConfirmationURL }}" style="background:#3e8cff;color:#fff;padding:12px 24px;border-radius:25px;text-decoration:none;">Reset password</a></p>
<p style="color:#666;font-size:14px;">If you did not request this, ignore this email.</p>
```

Paste that into **Reset Password** in the Supabase dashboard.

### Step 4 — Set Site URL and redirects

1. [Authentication → URL Configuration](https://supabase.com/dashboard/project/ifkviqlzhdsaovozlbqd/auth/url-configuration)
2. **Site URL**: your production LMS URL, e.g. `https://learn.nerdzfactory.co`
3. **Redirect URLs** — add:
   - `http://localhost:5174/**` (local dev)
   - `https://learn.nerdzfactory.co/**` (production)

Without correct redirect URLs, links in emails will fail.

### Step 5 — (Recommended) Custom SMTP — send from your domain

By default, emails come from Supabase (`noreply@mail.app.supabase.io`). For `info@nerdzfactory.co`:

1. [Project Settings → Authentication → SMTP](https://supabase.com/dashboard/project/ifkviqlzhdsaovozlbqd/settings/auth)
2. Enable **Custom SMTP**
3. Use your provider (e.g. Brevo, SendGrid, Amazon SES, Google Workspace)
4. Set **Sender email** to e.g. `info@nerdzfactory.co`
5. Set **Sender name** to `NerdzFactory Learning`

### Step 6 — Test each email

| Test | How |
|------|-----|
| Reset password | Admin login → “Forgot password?” (or trigger from Supabase Users) |
| Confirm signup | Create a new admin user with “Confirm email” enabled |
| Invite | Authentication → Users → Invite user |

---

## Part B — Phone number sign-in for learners (SMS OTP)

Today learners can sign in with **phone only** (no password).  
For **real SMS verification** (a code sent to their phone), enable **Phone OTP**.

### How it works for learners

1. Learner enters phone number (and name on sign-up)
2. They receive a **6-digit SMS code**
3. They enter the code in the app
4. They are signed in — no password

### Recommended for Nigeria: Termii + Send SMS Hook

Twilio’s **trial** only sends to numbers you verify manually. For **any Nigerian number** (including DND), use a **Supabase Send SMS Hook** and route OTPs through [Termii](https://termii.com) ([API docs](https://developers.termii.com/)).

```
Learner taps “Send code”
  → Supabase Auth generates OTP
  → Supabase calls Edge Function: send-sms
  → Function POSTs to Termii Messaging API (/api/sms/send)
  → Learner receives SMS
```

Supabase still generates and verifies the OTP. The hook only **delivers** the code via SMS (we use Termii’s Messaging API, not the Send Token API).

The LMS app code does **not** change — keep `VITE_USE_PHONE_OTP=true`.

#### Step 1 — Termii account

1. Sign up at [termii.com](https://termii.com)
2. Copy your **API key**: Dashboard → **Settings** → **API token** tab ([auth docs](https://developers.termii.com/authentication))
3. Copy your account **base URL** from the dashboard (e.g. `https://v3.api.termii.com`) — use this in all API requests ([intro](https://developers.termii.com/))
4. Request an approved **Sender ID** (3–11 characters, e.g. `NerdzFactory`) via the Sender ID API
5. Top up wallet credits
6. Ask Termii support to **activate the DND route** on your account if not already enabled (required for reliable OTP delivery to numbers on Do-Not-Disturb)

**Channel for OTP (important):**

| `TERMII_CHANNEL` | Use case |
|------------------|----------|
| **dnd** (recommended) | Transactional route — bypasses DND; use for login OTP |
| **generic** | Promotional only — Termii warns OTPs on this route may fail or get Sender ID blocked |

The Edge Function defaults to `channel=dnd` per [Termii Messaging API guidance](https://developers.termii.com/messaging-api).

#### Step 2 — Install Supabase CLI (Windows / Git Bash)

Global `npm install -g supabase` is **not supported**. From the `lms` folder, use the project dev dependency (already in `package.json`):

```bash
cd lms
npm install
npx supabase --version
```

Optional npm shortcuts: `npm run supabase:login`, `npm run supabase:link`, `npm run supabase:deploy-sms`.

Log in once (opens your browser):

```bash
npx supabase login
```

#### Step 3 — Deploy the Send SMS Edge Function

```bash
cd lms
npx supabase link --project-ref ifkviqlzhdsaovozlbqd
npx supabase functions deploy send-sms --no-verify-jwt
```

Set secrets (use your real values):

```bash
npx supabase secrets set \
  TERMII_API_KEY=your-api-key \
  TERMII_SENDER_ID=your-sender-id \
  TERMII_BASE_URL=https://v3.api.termii.com \
  TERMII_CHANNEL=dnd \
  SEND_SMS_HOOK_SECRET="v1,whsec_your-hook-secret"
```

Optional custom message (must include `{otp}` and `{purpose}`):

```bash
npx supabase secrets set TERMII_MESSAGE_TEMPLATE="Your NerdzFactory {purpose} code is {otp}. Do not share this code with anyone. It expires in 10 minutes. Powered by NerdzFactory."
```

`{purpose}` is filled from the database (migration `20260624120000_otp_purpose_pending.sql`) so sign-up and password-reset messages are always correct.

| When | Text in the message |
|------|---------------------|
| New account (sign up) | `sign up` |
| Forgot password | `password reset` |
| Other / MFA | `login` |

Function source: `lms/supabase/functions/send-sms/index.ts`

#### Step 4 — Enable the hook in Supabase Dashboard

Use **HTTPS**, not Postgres. Our sender is an Edge Function (Termii API), not a database function.

1. [Authentication → Hooks](https://supabase.com/dashboard/project/ifkviqlzhdsaovozlbqd/auth/hooks) → **Send SMS**
2. **Enable Send SMS hook**
3. **Hook type**: select **HTTPS** (ignore Postgres / schema / function fields)
4. **HTTP Endpoint**:

   `https://ifkviqlzhdsaovozlbqd.supabase.co/functions/v1/send-sms`

5. **Hook Secret**: click **Generate** and copy the full value (starts with `v1,whsec_…`)
6. Set the same secret on the Edge Function:

   ```bash
   npx supabase secrets set SEND_SMS_HOOK_SECRET="v1,whsec_paste-exact-value-here"
   ```

7. Save the hook in the dashboard

SMS Provider settings (Twilio, etc.) are disabled while the hook is enabled — that is expected.

#### Step 5 — Enable Phone auth (no Twilio required)

1. [Authentication → Providers → Phone](https://supabase.com/dashboard/project/ifkviqlzhdsaovozlbqd/auth/providers) → **ON**
2. You do **not** need Twilio credentials when the Send SMS hook is enabled — the hook sends the text instead

#### Step 5b — OTP expires in 10 minutes

Supabase Auth controls how long phone codes stay valid. Hosted projects need **`sms_otp_exp: 600`** (10 minutes).

**Easiest — from the `lms` folder:**

```bash
# Create a token at https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN=sbp_your_token   # Git Bash / Mac
npm run supabase:otp-expiry
```

On Windows PowerShell:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_your_token"
npm run supabase:otp-expiry
```

You should see: `sms_otp_exp is now 600 seconds (10 minutes).`

**Manual (curl):**

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/ifkviqlzhdsaovozlbqd/config/auth" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sms_otp_exp": 600}'
```

Optional: set the SMS text in Edge Function secrets (supports `{otp}` and `{purpose}`):

```bash
npx supabase secrets set TERMII_MESSAGE_TEMPLATE="Your NerdzFactory {purpose} code is {otp}. Do not share this code with anyone. It expires in 10 minutes. Powered by NerdzFactory."
```

#### Step 6 — Enable OTP in the LMS app

In `lms/.env`:

```env
VITE_SUPABASE_URL=https://ifkviqlzhdsaovozlbqd.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_USE_PHONE_OTP=true
```

Restart the dev server: `npm run dev`

#### Step 7 — Run migrations (if not already)

Run in order in the Supabase SQL Editor (see [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) for the full list). At minimum for phone OTP:

- `20260620120000_phone_otp_and_auth_emails.sql`
- `20260624120000_otp_purpose_pending.sql` — **required** for correct sign-up vs password-reset SMS wording

Then redeploy the SMS function: `npm run supabase:deploy-sms`

#### Step 8 — Test

1. Open `/signup` or `/login`
2. Enter a Nigerian number (`080…` or `+234…`)
3. Tap **Send code** → check SMS
4. Enter the 6-digit code

Check Termii dashboard (balance, delivery reports) and Supabase **Authentication → Logs** if delivery fails.

---

### Alternative: Twilio (not recommended for NG trial/production)

<details>
<summary>Twilio setup (expand if needed)</summary>

1. Create a [Twilio](https://www.twilio.com) account
2. Get **Account SID**, **Auth Token**, and an SMS-capable number
3. In Supabase Phone settings, paste Twilio credentials
4. **Trial accounts** only send to [verified numbers](https://www.twilio.com/user/account/phone-numbers/verified)

</details>

### Dev without SMS

If `VITE_USE_PHONE_OTP` is **not** set or `false`, learners use phone-only sign-in (no SMS) — fine for local testing only, **not** secure for production.

### Troubleshooting phone OTP

| Problem | Fix |
|---------|-----|
| Twilio “unverified number” | Use Termii hook above, or verify the number in Twilio (trial only) |
| No SMS received | Check Termii balance; confirm sender ID approved; use `TERMII_CHANNEL=dnd`; ensure DND route is active on your Termii account |
| Hook 401 | `SEND_SMS_HOOK_SECRET` must match the secret in Auth → Hooks exactly |
| “Phone provider not enabled” | Enable Phone in Supabase Auth providers |
| Invalid OTP | Codes expire after 10 minutes (`sms_otp_exp=600`); request a new code |
| User exists on sign-up | Use **Sign in** instead of Sign up |

---

## Quick reference

| Who | Sign-in URL | Method |
|-----|-------------|--------|
| **Learners** | `/login` | Phone + SMS code (if OTP enabled) or phone only |
| **Admins** | `/admin/login` | Email + password |

| Email type | Where to customize |
|------------|-------------------|
| Password reset, confirm signup, etc. | LMS Admin → Emails **then** Supabase → Auth → Templates |
| Custom learner emails (welcome, course done) | LMS Admin → Emails (future: wire to SMTP) |

---

## Migration order (all three)

1. `20260618120000_lms_tables.sql`
2. `20260619120000_admin_auth_course_emails.sql`
3. `20260620120000_phone_otp_and_auth_emails.sql`
