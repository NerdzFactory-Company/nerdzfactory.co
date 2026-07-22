/**
 * Supabase Send SMS Hook → Termii Messaging API
 *
 * Deploy: npx supabase functions deploy send-sms --no-verify-jwt
 * Secrets: TERMII_API_KEY, TERMII_SENDER_ID, SEND_SMS_HOOK_SECRET
 * Optional: TERMII_BASE_URL, TERMII_CHANNEL, TERMII_MESSAGE_TEMPLATE
 *
 * Uses lms_consume_otp_purpose (service role) so sign-up vs password-reset text is correct.
 *
 * Default SMS:
 * Your NerdzFactory {purpose} code is {otp}. Do not share this code with anyone.
 * It expires in 10 minutes. Powered by NerdzFactory.
 */
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

type OtpPurpose = 'signup' | 'recovery' | 'login'

type SmsHookPayload = {
  user: {
    phone?: string
    phone_confirmed_at?: string | null
    user_metadata?: Record<string, unknown>
  }
  sms: {
    otp?: string
    sms_type?: string
  }
}

type TermiiSendResponse = {
  code?: string
  status?: string | number
  message?: string
  message_id?: string
  message_id_str?: string
}

const PURPOSE_LABELS: Record<OtpPurpose, string> = {
  signup: 'sign up',
  recovery: 'password reset',
  login: 'login',
}

const DEFAULT_MESSAGE_TEMPLATE =
  'Your NerdzFactory {purpose} code is {otp}. Do not share this code with anyone. It expires in 10 minutes. Powered by NerdzFactory.'

Deno.serve(async (req) => {
  console.log('[send-sms]', req.method, req.url)

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const hookSecret = Deno.env.get('SEND_SMS_HOOK_SECRET')
  if (!hookSecret) {
    return hookError('SEND_SMS_HOOK_SECRET is not configured on the Edge Function')
  }

  const payload = await req.text()
  const headers = webhookHeaders(req)
  const secret = hookSecret.replace(/^v1,whsec_/, '')
  const wh = new Webhook(secret)

  let user: SmsHookPayload['user']
  let sms: SmsHookPayload['sms']

  try {
    const verified = wh.verify(payload, headers) as SmsHookPayload
    user = verified.user
    sms = verified.sms
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'signature verification failed'
    console.error('[send-sms] webhook verify failed:', detail)
    return hookError(
      `Invalid Send SMS hook signature. Regenerate the hook secret in Auth → Hooks and paste the same value into Edge Function secret SEND_SMS_HOOK_SECRET. (${detail})`,
    )
  }

  const phone = user?.phone
  const otp = sms?.otp
  if (!phone || !otp) {
    return hookError('Missing phone number or OTP in hook payload')
  }

  const purpose = await resolveOtpPurpose(user, sms, phone)
  const message = buildOtpMessage(otp, purpose)
  const result = await sendViaTermii(phone, message)
  if (!result.ok) {
    console.error('[send-sms] Termii failed:', result.error)
    return hookError(result.error)
  }

  console.log(
    '[send-sms] Termii accepted:',
    result.messageId ?? 'no message_id',
    'purpose',
    purpose,
    'to',
    phone.replace(/\d(?=\d{4})/g, '*'),
  )
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

async function resolveOtpPurpose(
  user: SmsHookPayload['user'],
  sms: SmsHookPayload['sms'],
  phone: string,
): Promise<OtpPurpose> {
  const fromDb = await consumeOtpPurposeFromDb(phone)
  if (fromDb === 'signup' || fromDb === 'recovery') return fromDb

  const meta = user?.user_metadata?.otp_purpose
  if (meta === 'signup' || meta === 'recovery') return meta

  if (sms?.sms_type === 'mfa') return 'login'

  // Do not infer from phone_confirmed_at — returning users verifying again were mislabeled as password reset.
  console.warn('[send-sms] otp purpose missing from DB/metadata; defaulting to sign up for', phone.replace(/\d(?=\d{4})/g, '*'))
  return 'signup'
}

async function consumeOtpPurposeFromDb(phone: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    console.warn('[send-sms] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — cannot read otp purpose')
    return null
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/lms_consume_otp_purpose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ p_phone: phone }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('[send-sms] lms_consume_otp_purpose failed:', res.status, body.slice(0, 200))
      return null
    }
    const data: unknown = await res.json()
    if (data === 'signup' || data === 'recovery') return data
    return null
  } catch (err) {
    console.error('[send-sms] lms_consume_otp_purpose error:', err)
    return null
  }
}

function buildOtpMessage(otp: string, purpose: OtpPurpose): string {
  const purposeLabel = PURPOSE_LABELS[purpose]
  const template = Deno.env.get('TERMII_MESSAGE_TEMPLATE') ?? DEFAULT_MESSAGE_TEMPLATE
  return template.replace(/\{otp\}/g, otp).replace(/\{purpose\}/g, purposeLabel)
}

function webhookHeaders(req: Request): Record<string, string> {
  const h = Object.fromEntries(req.headers)
  return {
    'webhook-id': h['webhook-id'] ?? '',
    'webhook-timestamp': h['webhook-timestamp'] ?? '',
    'webhook-signature': h['webhook-signature'] ?? '',
  }
}

function hookError(message: string): Response {
  return new Response(JSON.stringify({ error: { http_code: 500, message } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function formatPhoneForTermii(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('234')) return digits
  if (digits.startsWith('0') && digits.length === 11) return `234${digits.slice(1)}`
  if (digits.length === 10) return `234${digits}`
  return digits
}

async function sendViaTermii(
  phone: string,
  message: string,
): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
  const apiKey = Deno.env.get('TERMII_API_KEY')
  const sender = Deno.env.get('TERMII_SENDER_ID')
  const baseUrl = (Deno.env.get('TERMII_BASE_URL') ?? 'https://v3.api.termii.com').replace(/\/$/, '')

  if (!apiKey || !sender) {
    return { ok: false, error: 'TERMII_API_KEY or TERMII_SENDER_ID is not configured in Edge Function secrets' }
  }

  const channel = Deno.env.get('TERMII_CHANNEL') ?? 'generic'
  const to = formatPhoneForTermii(phone)

  return postTermiiSms(baseUrl, { api_key: apiKey, to, from: sender, sms: message, type: 'plain', channel })
}

async function postTermiiSms(
  baseUrl: string,
  body: Record<string, string>,
): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
  let res: Response
  try {
    res = await fetch(`${baseUrl}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error'
    return { ok: false, error: `Termii request failed: ${msg}` }
  }

  const raw = await res.text()
  let data: TermiiSendResponse = {}

  try {
    data = JSON.parse(raw)
  } catch {
    return { ok: false, error: `Termii HTTP ${res.status}: ${raw.slice(0, 240)}` }
  }

  const sent =
    res.ok &&
    (data.code === 'ok' ||
      data.status === 'success' ||
      data.status === 200 ||
      Boolean(data.message_id || data.message_id_str))

  if (sent) {
    return { ok: true, messageId: data.message_id_str ?? data.message_id }
  }

  const detail =
    data.message ||
    (typeof data.code === 'string' && data.code !== 'ok' ? data.code : '') ||
    (typeof data.status === 'string' ? data.status : '') ||
    raw.slice(0, 200)

  let error = `Termii rejected SMS: ${String(detail).trim() || `HTTP ${res.status}`}`

  if (body.channel === 'dnd') {
    error +=
      ' If DND route is not active on your Termii account, set TERMII_CHANNEL=generic in Edge Function secrets (less reliable for OTP).'
  }

  return { ok: false, error }
}
