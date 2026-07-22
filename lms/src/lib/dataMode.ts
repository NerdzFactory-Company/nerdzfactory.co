import { supabase } from '@/lib/supabase'

/** Load courses and progress from Postgres; requires `VITE_USE_SUPABASE_DATA=true`. */
export function isSupabaseDataEnabled(): boolean {
  return import.meta.env.VITE_USE_SUPABASE_DATA === 'true' && Boolean(supabase)
}
