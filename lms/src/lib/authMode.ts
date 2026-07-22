import { supabase } from '@/lib/supabase'

/** Supabase Auth for learners (OTP/password) and admins; requires `VITE_USE_SUPABASE_AUTH=true`. */
export function isSupabaseAuthEnabled(): boolean {
  return import.meta.env.VITE_USE_SUPABASE_AUTH === 'true' && Boolean(supabase)
}
