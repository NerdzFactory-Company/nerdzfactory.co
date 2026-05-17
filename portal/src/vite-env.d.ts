/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** POST endpoint (e.g. https://www.nerdzfactory.co/portal-media/upload.php) */
  readonly VITE_MEDIA_UPLOAD_URL?: string
  /** Same-origin JSON from ical-json.php — merges into calendar + list */
  readonly VITE_TEAM_CALENDAR_JSON_URL?: string
  /** Google “Embed calendar” iframe src URL */
  readonly VITE_GOOGLE_CALENDAR_EMBED_URL?: string
  /** Supabase project URL — Realtime presence + live notes */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase anon (public) key */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
