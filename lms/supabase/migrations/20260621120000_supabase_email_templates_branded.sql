-- Branded Supabase Auth email templates (official {{ .Variable }} syntax)
-- Run in SQL Editor after migrations 001–003.
-- Then copy each template from Admin → Emails into Supabase Auth → Email Templates.

update public.lms_email_templates t set
  supabase_template_key = 'confirm_signup',
  supabase_subject = 'Confirm your email — NerdzFactory Learning',
  variables = '["ConfirmationURL", "SiteURL", "Email"]'::jsonb,
  supabase_body_html = src.html,
  body_html = src.html,
  subject = 'Confirm your email — NerdzFactory Learning',
  updated_at = now()
from (select $html$
<div style="background-color:#f8fafc;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e5e7eb;">
    <p style="margin:0 0 24px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#3e8cff;letter-spacing:0.05em;text-transform:uppercase;">NerdzFactory Learning</p>
    <h2 style="color:#0B1120;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;margin:0 0 16px;line-height:1.3;">Confirm your email address</h2>
    <p style="color:#555555;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;margin:0 0 16px;">Follow the link below to confirm <strong>{{ .Email }}</strong> and finish setting up your NerdzFactory Learning admin account.</p>
    <p style="margin:0 0 24px;"><a href="{{ .ConfirmationURL }}" style="background-color:#3e8cff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:25px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;display:inline-block;">Confirm email address</a></p>
    <p style="color:#888888;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;margin:0;">If you did not create an account, you can safely ignore this email.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
    <p style="color:#888888;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;margin:0;">NerdzFactory Company<br />Innovation · Development · Technology<br /><a href="https://nerdzfactory.co" style="color:#3e8cff;text-decoration:none;">nerdzfactory.co</a> &nbsp;·&nbsp; <a href="tel:+2349164638956" style="color:#3e8cff;text-decoration:none;">+234 916 463 8956</a></p>
  </div>
</div>
$html$ as html) src
where t.id = 'admin_confirm_signup';

update public.lms_email_templates t set
  supabase_template_key = 'recovery',
  supabase_subject = 'Reset your password — NerdzFactory Learning',
  variables = '["ConfirmationURL", "SiteURL", "Email"]'::jsonb,
  supabase_body_html = src.html,
  body_html = src.html,
  subject = 'Reset your password — NerdzFactory Learning',
  updated_at = now()
from (select $html$
<div style="background-color:#f8fafc;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e5e7eb;">
    <p style="margin:0 0 24px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#3e8cff;letter-spacing:0.05em;text-transform:uppercase;">NerdzFactory Learning</p>
    <h2 style="color:#0B1120;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;margin:0 0 16px;line-height:1.3;">Reset your password</h2>
    <p style="color:#555555;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;margin:0 0 16px;">We received a request to reset the password for <strong>{{ .Email }}</strong>.</p>
    <p style="color:#555555;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;margin:0 0 16px;">Click the button below to choose a new password. This link expires after a short time.</p>
    <p style="margin:0 0 24px;"><a href="{{ .ConfirmationURL }}" style="background-color:#3e8cff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:25px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;display:inline-block;">Reset password</a></p>
    <p style="color:#888888;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;margin:0;">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
    <p style="color:#888888;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;margin:0;">NerdzFactory Company<br />Innovation · Development · Technology<br /><a href="https://nerdzfactory.co" style="color:#3e8cff;text-decoration:none;">nerdzfactory.co</a> &nbsp;·&nbsp; <a href="tel:+2349164638956" style="color:#3e8cff;text-decoration:none;">+234 916 463 8956</a></p>
  </div>
</div>
$html$ as html) src
where t.id = 'admin_password_reset';

update public.lms_email_templates t set
  supabase_template_key = 'magic_link',
  supabase_subject = 'Your sign-in link — NerdzFactory Learning',
  variables = '["ConfirmationURL", "SiteURL", "Email"]'::jsonb,
  supabase_body_html = src.html,
  body_html = src.html,
  subject = 'Your sign-in link — NerdzFactory Learning',
  updated_at = now()
from (select $html$
<div style="background-color:#f8fafc;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e5e7eb;">
    <p style="margin:0 0 24px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#3e8cff;letter-spacing:0.05em;text-transform:uppercase;">NerdzFactory Learning</p>
    <h2 style="color:#0B1120;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;margin:0 0 16px;line-height:1.3;">Sign in to NerdzFactory Learning</h2>
    <p style="color:#555555;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;margin:0 0 16px;">Click the button below to sign in to your admin account as <strong>{{ .Email }}</strong>.</p>
    <p style="margin:0 0 24px;"><a href="{{ .ConfirmationURL }}" style="background-color:#3e8cff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:25px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;display:inline-block;">Sign in</a></p>
    <p style="color:#888888;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;margin:0;">If you did not request this link, you can safely ignore this email.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
    <p style="color:#888888;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;margin:0;">NerdzFactory Company<br />Innovation · Development · Technology<br /><a href="https://nerdzfactory.co" style="color:#3e8cff;text-decoration:none;">nerdzfactory.co</a> &nbsp;·&nbsp; <a href="tel:+2349164638956" style="color:#3e8cff;text-decoration:none;">+234 916 463 8956</a></p>
  </div>
</div>
$html$ as html) src
where t.id = 'admin_magic_link';

update public.lms_email_templates t set
  supabase_template_key = 'invite',
  supabase_subject = 'You are invited to NerdzFactory Learning',
  variables = '["ConfirmationURL", "SiteURL", "Email"]'::jsonb,
  supabase_body_html = src.html,
  body_html = src.html,
  subject = 'You are invited to NerdzFactory Learning',
  updated_at = now()
from (select $html$
<div style="background-color:#f8fafc;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e5e7eb;">
    <p style="margin:0 0 24px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#3e8cff;letter-spacing:0.05em;text-transform:uppercase;">NerdzFactory Learning</p>
    <h2 style="color:#0B1120;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;margin:0 0 16px;line-height:1.3;">You're invited</h2>
    <p style="color:#555555;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;margin:0 0 16px;">You have been invited to join <strong>NerdzFactory Learning</strong> as an administrator.</p>
    <p style="color:#555555;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;margin:0 0 16px;">Click below to accept the invitation and create your account.</p>
    <p style="margin:0 0 24px;"><a href="{{ .ConfirmationURL }}" style="background-color:#3e8cff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:25px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;display:inline-block;">Accept invitation</a></p>
    <p style="color:#888888;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;margin:0;">If you were not expecting this invitation, you can ignore this email.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
    <p style="color:#888888;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;margin:0;">NerdzFactory Company<br />Innovation · Development · Technology<br /><a href="https://nerdzfactory.co" style="color:#3e8cff;text-decoration:none;">nerdzfactory.co</a> &nbsp;·&nbsp; <a href="tel:+2349164638956" style="color:#3e8cff;text-decoration:none;">+234 916 463 8956</a></p>
  </div>
</div>
$html$ as html) src
where t.id = 'admin_invite_user';

update public.lms_email_templates t set
  supabase_template_key = 'email_change',
  supabase_subject = 'Confirm your new email — NerdzFactory Learning',
  variables = '["ConfirmationURL", "SiteURL", "Email", "NewEmail"]'::jsonb,
  supabase_body_html = src.html,
  body_html = src.html,
  subject = 'Confirm your new email — NerdzFactory Learning',
  updated_at = now()
from (select $html$
<div style="background-color:#f8fafc;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e5e7eb;">
    <p style="margin:0 0 24px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#3e8cff;letter-spacing:0.05em;text-transform:uppercase;">NerdzFactory Learning</p>
    <h2 style="color:#0B1120;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;margin:0 0 16px;line-height:1.3;">Confirm your new email address</h2>
    <p style="color:#555555;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;margin:0 0 16px;">You requested to change your email from <strong>{{ .Email }}</strong> to <strong>{{ .NewEmail }}</strong>.</p>
    <p style="color:#555555;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;margin:0 0 16px;">Follow the link below to confirm this change.</p>
    <p style="margin:0 0 24px;"><a href="{{ .ConfirmationURL }}" style="background-color:#3e8cff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:25px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;display:inline-block;">Confirm new email</a></p>
    <p style="color:#888888;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;margin:0;">If you did not request this change, contact us immediately.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
    <p style="color:#888888;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;margin:0;">NerdzFactory Company<br />Innovation · Development · Technology<br /><a href="https://nerdzfactory.co" style="color:#3e8cff;text-decoration:none;">nerdzfactory.co</a> &nbsp;·&nbsp; <a href="tel:+2349164638956" style="color:#3e8cff;text-decoration:none;">+234 916 463 8956</a></p>
  </div>
</div>
$html$ as html) src
where t.id = 'admin_change_email';

update public.lms_email_templates t set
  supabase_template_key = 'reauthentication',
  supabase_subject = 'Verify your identity — NerdzFactory Learning',
  variables = '["ConfirmationURL", "SiteURL", "Email", "Token"]'::jsonb,
  supabase_body_html = src.html,
  body_html = src.html,
  subject = 'Verify your identity — NerdzFactory Learning',
  updated_at = now()
from (select $html$
<div style="background-color:#f8fafc;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e5e7eb;">
    <p style="margin:0 0 24px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#3e8cff;letter-spacing:0.05em;text-transform:uppercase;">NerdzFactory Learning</p>
    <h2 style="color:#0B1120;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;margin:0 0 16px;line-height:1.3;">Verify it's you</h2>
    <p style="color:#555555;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;margin:0 0 16px;">For your security, we need to verify your identity before continuing on <strong>{{ .Email }}</strong>.</p>
    <p style="color:#555555;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;margin:0 0 16px;">Click the button below to confirm it is you.</p>
    <p style="margin:0 0 24px;"><a href="{{ .ConfirmationURL }}" style="background-color:#3e8cff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:25px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;display:inline-block;">Verify identity</a></p>
    <p style="color:#888888;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;margin:0;">If you did not start this action, please secure your account immediately.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
    <p style="color:#888888;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;margin:0;">NerdzFactory Company<br />Innovation · Development · Technology<br /><a href="https://nerdzfactory.co" style="color:#3e8cff;text-decoration:none;">nerdzfactory.co</a> &nbsp;·&nbsp; <a href="tel:+2349164638956" style="color:#3e8cff;text-decoration:none;">+234 916 463 8956</a></p>
  </div>
</div>
$html$ as html) src
where t.id = 'admin_reauthentication';
