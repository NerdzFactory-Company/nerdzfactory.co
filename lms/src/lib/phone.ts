/** Normalize Nigerian phone numbers to +234XXXXXXXXXX */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+234${digits.slice(1)}`
  }
  if (digits.length === 13 && digits.startsWith('234')) {
    return `+${digits}`
  }
  if (digits.length === 10 && /^[789]/.test(digits)) {
    return `+234${digits}`
  }
  return null
}

export function formatPhoneDisplay(phone: string): string {
  if (phone.startsWith('+234') && phone.length === 14) {
    return `0${phone.slice(4, 7)} ${phone.slice(7, 10)} ${phone.slice(10)}`
  }
  return phone
}

export function isValidPhone(raw: string): boolean {
  return normalizePhone(raw) !== null
}

/** Variants stored in DB / Supabase Auth (E.164, digits-only, local 0…). */
export function phoneLookupVariants(raw: string): string[] {
  const normalized = normalizePhone(raw)
  if (!normalized) return [raw.trim()].filter(Boolean)
  const digits = normalized.replace(/\D/g, '')
  return [...new Set([normalized, `+${digits}`, digits, `0${digits.slice(3)}`])]
}
