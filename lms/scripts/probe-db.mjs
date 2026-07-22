// Quick diagnostic: checks which RPCs / tables / storage buckets exist on the
// live Supabase project, using only the anon key from .env.
// An RPC that exists but needs auth returns NOT_AUTHENTICATED / FORBIDDEN;
// a missing or mis-signed RPC returns PGRST202 "not found in schema cache".
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(join(__dirname, '..', '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

const URL_BASE = env.VITE_SUPABASE_URL
const KEY = env.VITE_SUPABASE_ANON_KEY
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

async function rpc(name, args) {
  const res = await fetch(`${URL_BASE}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(args),
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  const msg = typeof body === 'object' && body ? body.message ?? JSON.stringify(body) : String(body)
  console.log(`${res.ok ? 'OK  ' : res.status} ${name}: ${msg.slice(0, 140)}`)
}

async function table(name) {
  const res = await fetch(`${URL_BASE}/rest/v1/${name}?select=*&limit=1`, { headers })
  const text = await res.text()
  console.log(`${res.status} table ${name}: ${text.slice(0, 120)}`)
}

async function bucketObject(path) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/public/lms-media/${path}`)
  const text = await res.text()
  console.log(`${res.status} storage lms-media/${path}: ${text.slice(0, 120)}`)
}

console.log('— RPC signatures (expect NOT_AUTHENTICATED/FORBIDDEN if present) —')
await rpc('lms_admin_upsert_course', {
  p_id: 'probe', p_title: 't', p_description: '', p_short_description: '', p_homepage_content: '',
  p_thumbnail: '', p_hero_image: '', p_category: '', p_level: 'Beginner',
  p_duration_estimate: '', p_time_to_complete: '', p_prerequisites: '', p_target_audience: '',
  p_learning_outcomes: [], p_instructor_name: '', p_instructor_bio: '',
  p_certificate_offered: false, p_sort_order: 0, p_published: false,
})
await rpc('lms_admin_upsert_lesson', {
  p_id: 'probe', p_course_id: 'probe', p_title: 't', p_description: '', p_video_url: '',
  p_duration: '', p_sort_order: 0, p_prerequisites: '', p_objectives: [], p_key_takeaways: [],
  p_resources: [], p_thumbnail_url: '',
})
await rpc('lms_admin_reorder_courses', { p_orders: [{ id: 'probe', sort_order: 1 }] })
await rpc('lms_admin_set_course_published', { p_id: 'probe', p_published: false })
await rpc('lms_staff_upsert_assignment', {
  p_id: 'probe', p_title: 't', p_description: '', p_questions: [], p_sort_order: 0, p_published: false,
})
await rpc('lms_staff_list_assignments', {})
await rpc('lms_list_assignments', {})
await rpc('lms_admin_delete_lesson', { p_id: 'probe' })

console.log('\n— Published-only course read (anon) —')
const allCourses = await fetch(`${URL_BASE}/rest/v1/lms_courses?select=id,published`, { headers }).then((r) => r.json())
const publishedCourses = await fetch(`${URL_BASE}/rest/v1/lms_courses?select=id,published&published=eq.true`, { headers }).then((r) => r.json())
console.log(`all=${Array.isArray(allCourses) ? allCourses.length : '?'} published=${Array.isArray(publishedCourses) ? publishedCourses.length : '?'}`)

console.log('\n— Tables —')
await table('lms_site_images')
await table('lms_courses')

console.log('\n— Storage bucket —')
await bucketObject('does-not-exist.png')
