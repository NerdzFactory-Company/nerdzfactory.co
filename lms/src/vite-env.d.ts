/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_USE_PHONE_OTP: string
  readonly VITE_USE_SUPABASE_AUTH: string
  readonly VITE_USE_SUPABASE_DATA: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
