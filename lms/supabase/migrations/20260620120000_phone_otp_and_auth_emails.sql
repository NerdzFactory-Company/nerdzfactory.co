-- NerdzFactory LMS migration 003
-- Phone OTP learners + Supabase auth email template metadata

-- Link learners to Supabase Auth (phone OTP)
alter table public.lms_learners
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

-- Ensure learner row exists after phone OTP (called with authenticated phone session)
create or replace function public.lms_ensure_learner(p_phone text, p_name text default null)
returns public.lms_learners
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_learners;
  uid uuid;
begin
  uid := auth.uid();
  if p_phone is null or length(trim(p_phone)) < 10 then
    raise exception 'INVALID_PHONE';
  end if;

  select * into result from public.lms_learners where phone = p_phone;

  if result is not null then
    update public.lms_learners
    set auth_user_id = coalesce(auth_user_id, uid),
        name = case when p_name is not null and length(trim(p_name)) > 0 then trim(p_name) else name end
    where id = result.id
    returning * into result;
    return result;
  end if;

  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'NAME_REQUIRED';
  end if;

  insert into public.lms_learners (phone, name, auth_user_id)
  values (p_phone, trim(p_name), uid)
  returning * into result;
  return result;
end;
$$;

grant execute on function public.lms_ensure_learner(text, text) to authenticated;

-- Supabase Auth email template metadata
alter table public.lms_email_templates
  add column if not exists supabase_template_key text,
  add column if not exists supabase_subject text not null default '',
  add column if not exists supabase_body_html text not null default '';

update public.lms_email_templates set
  supabase_template_key = 'confirm_signup',
  supabase_subject = 'Confirm your NerdzFactory Learning admin account',
  supabase_body_html = '<h2>Confirm your email</h2><p>Follow this link to confirm your admin account:</p><p><a href="{{ .ConfirmationURL }}">Confirm email</a></p>'
where id = 'admin_confirm_signup';

update public.lms_email_templates set
  supabase_template_key = 'recovery',
  supabase_subject = 'Reset your NerdzFactory Learning password',
  supabase_body_html = '<h2>Reset password</h2><p>Follow this link to reset your password:</p><p><a href="{{ .ConfirmationURL }}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>'
where id = 'admin_password_reset';

update public.lms_email_templates set
  supabase_template_key = 'magic_link',
  supabase_subject = 'Your NerdzFactory Learning sign-in link',
  supabase_body_html = '<h2>Sign in</h2><p>Follow this link to sign in:</p><p><a href="{{ .ConfirmationURL }}">Sign in to NerdzFactory Learning</a></p>'
where id = 'admin_magic_link';

insert into public.lms_email_templates (
  id, name, description, category, subject, body_html, body_text, variables,
  sync_to_supabase_auth, supabase_template_key, supabase_subject, supabase_body_html
)
values
  (
    'admin_invite_user',
    'Invite user',
    'Sent when you invite a new admin from Supabase → Authentication → Users.',
    'admin',
    'You have been invited to NerdzFactory Learning',
    '<h2>You''re invited</h2><p>You have been invited to manage NerdzFactory Learning.</p><p><a href="{{invite_url}}">Accept invitation</a></p>',
    'You have been invited. Accept: {{invite_url}}',
    '["invite_url"]'::jsonb,
    true,
    'invite',
    'You have been invited to NerdzFactory Learning',
    '<h2>You''re invited</h2><p>You have been invited to create an admin account on NerdzFactory Learning.</p><p><a href="{{ .ConfirmationURL }}">Accept the invite</a></p>'
  ),
  (
    'admin_change_email',
    'Change email address',
    'Sent when an admin changes their email address.',
    'admin',
    'Confirm your new email address',
    '<h2>Confirm new email</h2><p><a href="{{confirm_url}}">Confirm email change</a></p>',
    'Confirm your new email: {{confirm_url}}',
    '["confirm_url"]'::jsonb,
    true,
    'email_change',
    'Confirm your new NerdzFactory Learning email',
    '<h2>Confirm new email</h2><p>Follow this link to confirm your new email address:</p><p><a href="{{ .ConfirmationURL }}">Confirm email change</a></p>'
  ),
  (
    'admin_reauthentication',
    'Reauthentication',
    'Sent when Supabase needs the user to verify identity again.',
    'admin',
    'Verify your identity',
    '<h2>Verify it''s you</h2><p><a href="{{verify_url}}">Verify identity</a></p>',
    'Verify your identity: {{verify_url}}',
    '["verify_url"]'::jsonb,
    true,
    'reauthentication',
    'Verify your identity — NerdzFactory Learning',
    '<h2>Verify it''s you</h2><p>Follow this link to confirm your identity:</p><p><a href="{{ .ConfirmationURL }}">Verify</a></p>'
  )
on conflict (id) do nothing;

-- Allow admins to update supabase_* columns too
create or replace function public.lms_admin_update_email_template(
  p_id text,
  p_subject text,
  p_body_html text,
  p_body_text text,
  p_supabase_subject text default null,
  p_supabase_body_html text default null
)
returns public.lms_email_templates
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.lms_email_templates;
begin
  perform public.lms_assert_admin_auth();
  update public.lms_email_templates
  set subject = p_subject,
      body_html = p_body_html,
      body_text = p_body_text,
      supabase_subject = coalesce(p_supabase_subject, supabase_subject),
      supabase_body_html = coalesce(p_supabase_body_html, supabase_body_html),
      updated_at = now()
  where id = p_id
  returning * into result;
  if result is null then
    raise exception 'TEMPLATE_NOT_FOUND';
  end if;
  return result;
end;
$$;

grant execute on function public.lms_admin_update_email_template(text, text, text, text, text, text) to authenticated;
