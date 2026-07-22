/**
 * Supabase Auth email templates — use ONLY Supabase Go-template variables.
 * @see https://supabase.com/docs/guides/auth/auth-email-templates
 *
 * Paste supabaseSubject + supabaseBodyHtml into:
 * Supabase Dashboard → Authentication → Emails → Templates
 */

export const SUPABASE_EMAIL_VARS = [
  '{{ .ConfirmationURL }}',
  '{{ .SiteURL }}',
  '{{ .Email }}',
  '{{ .Token }}',
  '{{ .TokenHash }}',
  '{{ .RedirectTo }}',
  '{{ .NewEmail }}',
] as const

const footer = `
<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
<p style="color:#888888;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;margin:0;">
  NerdzFactory Company<br />
  Innovation · Development · Technology<br />
  <a href="https://nerdzfactory.co" style="color:#3e8cff;text-decoration:none;">nerdzfactory.co</a>
  &nbsp;·&nbsp;
  <a href="tel:+2349164638956" style="color:#3e8cff;text-decoration:none;">+234 916 463 8956</a>
</p>`.trim()

function shell(title: string, body: string): string {
  return `
<div style="background-color:#f8fafc;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e5e7eb;">
    <p style="margin:0 0 24px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#3e8cff;letter-spacing:0.05em;text-transform:uppercase;">NerdzFactory Learning</p>
    <h2 style="color:#0B1120;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;margin:0 0 16px;line-height:1.3;">${title}</h2>
    ${body}
    ${footer}
  </div>
</div>`.trim()
}

function cta(href: string, label: string): string {
  return `<p style="margin:0 0 24px;"><a href="${href}" style="background-color:#3e8cff;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:25px;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;display:inline-block;">${label}</a></p>`
}

function p(text: string): string {
  return `<p style="color:#555555;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;margin:0 0 16px;">${text}</p>`
}

function muted(text: string): string {
  return `<p style="color:#888888;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;margin:0;">${text}</p>`
}

export const supabaseAuthTemplates = {
  confirm_signup: {
    id: 'admin_confirm_signup',
    supabaseTemplateKey: 'confirm_signup',
    supabaseDashboardName: 'Confirm signup',
    supabaseSubject: 'Confirm your email — NerdzFactory Learning',
    variables: ['ConfirmationURL', 'SiteURL', 'Email'],
    supabaseBodyHtml: shell(
      'Confirm your email address',
      `
${p('Follow the link below to confirm <strong>{{ .Email }}</strong> and finish setting up your NerdzFactory Learning admin account.')}
${cta('{{ .ConfirmationURL }}', 'Confirm email address')}
${muted('If you did not create an account, you can safely ignore this email.')}
      `.trim(),
    ),
  },
  recovery: {
    id: 'admin_password_reset',
    supabaseTemplateKey: 'recovery',
    supabaseDashboardName: 'Reset password',
    supabaseSubject: 'Reset your password — NerdzFactory Learning',
    variables: ['ConfirmationURL', 'SiteURL', 'Email'],
    supabaseBodyHtml: shell(
      'Reset your password',
      `
${p('We received a request to reset the password for <strong>{{ .Email }}</strong>.')}
${p('Click the button below to choose a new password. This link expires after a short time.')}
${cta('{{ .ConfirmationURL }}', 'Reset password')}
${muted('If you did not request a password reset, you can safely ignore this email. Your password will not change.')}
      `.trim(),
    ),
  },
  magic_link: {
    id: 'admin_magic_link',
    supabaseTemplateKey: 'magic_link',
    supabaseDashboardName: 'Magic Link',
    supabaseSubject: 'Your sign-in link — NerdzFactory Learning',
    variables: ['ConfirmationURL', 'SiteURL', 'Email'],
    supabaseBodyHtml: shell(
      'Sign in to NerdzFactory Learning',
      `
${p('Click the button below to sign in to your admin account as <strong>{{ .Email }}</strong>.')}
${cta('{{ .ConfirmationURL }}', 'Sign in')}
${muted('If you did not request this link, you can safely ignore this email.')}
      `.trim(),
    ),
  },
  invite: {
    id: 'admin_invite_user',
    supabaseTemplateKey: 'invite',
    supabaseDashboardName: 'Invite user',
    supabaseSubject: 'You are invited to NerdzFactory Learning',
    variables: ['ConfirmationURL', 'SiteURL', 'Email'],
    supabaseBodyHtml: shell(
      'You\'re invited',
      `
${p('You have been invited to join <strong>NerdzFactory Learning</strong> as an administrator.')}
${p('Click below to accept the invitation and create your account.')}
${cta('{{ .ConfirmationURL }}', 'Accept invitation')}
${muted('If you were not expecting this invitation, you can ignore this email.')}
      `.trim(),
    ),
  },
  email_change: {
    id: 'admin_change_email',
    supabaseTemplateKey: 'email_change',
    supabaseDashboardName: 'Change Email Address',
    supabaseSubject: 'Confirm your new email — NerdzFactory Learning',
    variables: ['ConfirmationURL', 'SiteURL', 'Email', 'NewEmail'],
    supabaseBodyHtml: shell(
      'Confirm your new email address',
      `
${p('You requested to change your email from <strong>{{ .Email }}</strong> to <strong>{{ .NewEmail }}</strong>.')}
${p('Follow the link below to confirm this change.')}
${cta('{{ .ConfirmationURL }}', 'Confirm new email')}
${muted('If you did not request this change, contact us immediately.')}
      `.trim(),
    ),
  },
  reauthentication: {
    id: 'admin_reauthentication',
    supabaseTemplateKey: 'reauthentication',
    supabaseDashboardName: 'Reauthentication',
    supabaseSubject: 'Verify your identity — NerdzFactory Learning',
    variables: ['ConfirmationURL', 'SiteURL', 'Email', 'Token'],
    supabaseBodyHtml: shell(
      'Verify it\'s you',
      `
${p('For your security, we need to verify your identity before continuing on <strong>{{ .Email }}</strong>.')}
${p('Click the button below to confirm it is you.')}
${cta('{{ .ConfirmationURL }}', 'Verify identity')}
${muted('If you did not start this action, please secure your account immediately.')}
      `.trim(),
    ),
  },
} as const
