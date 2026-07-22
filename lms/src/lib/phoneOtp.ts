/** Phone OTP via Supabase Auth is enabled when this is "true" and Supabase is configured. */
export function isPhoneOtpEnabled(): boolean {
  return import.meta.env.VITE_USE_PHONE_OTP === 'true'
}
