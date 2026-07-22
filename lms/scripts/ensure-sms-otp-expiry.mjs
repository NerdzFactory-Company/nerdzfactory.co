#!/usr/bin/env node
/**
 * Ensure phone OTP codes expire in 10 minutes (600 seconds) on hosted Supabase.
 *
 * Requires a personal access token from https://supabase.com/dashboard/account/tokens
 *
 *   set SUPABASE_ACCESS_TOKEN=sbp_...
 *   npm run supabase:otp-expiry
 *
 * Optional: SUPABASE_PROJECT_REF (default: ifkviqlzhdsaovozlbqd)
 */
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'ifkviqlzhdsaovozlbqd'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const TARGET_SECONDS = 600

if (!TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN.')
  console.error('Create one at https://supabase.com/dashboard/account/tokens then run:')
  console.error('  set SUPABASE_ACCESS_TOKEN=sbp_your_token   (PowerShell)')
  console.error('  npm run supabase:otp-expiry')
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
}

const base = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`

async function main() {
  const getRes = await fetch(base, { headers })
  if (!getRes.ok) {
    console.error('Could not read auth config:', getRes.status, await getRes.text())
    process.exit(1)
  }
  const current = await getRes.json()
  const currentExp = current.sms_otp_exp

  if (currentExp === TARGET_SECONDS) {
    console.log(`OK — sms_otp_exp is already ${TARGET_SECONDS} seconds (10 minutes).`)
    return
  }

  console.log(`Current sms_otp_exp: ${currentExp ?? 'not set'}. Setting to ${TARGET_SECONDS}…`)

  const patchRes = await fetch(base, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ sms_otp_exp: TARGET_SECONDS }),
  })

  if (!patchRes.ok) {
    console.error('PATCH failed:', patchRes.status, await patchRes.text())
    process.exit(1)
  }

  const updated = await patchRes.json()
  console.log(`Done — sms_otp_exp is now ${updated.sms_otp_exp} seconds (10 minutes).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
