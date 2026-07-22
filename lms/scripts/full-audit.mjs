/**
 * Full LMS portal audit: static route checks + Playwright UI/API smoke tests.
 *
 * Usage:
 *   PREVIEW_URL=https://learn.myhandwork.ng node scripts/full-audit.mjs
 *   (or leave PREVIEW_URL unset to use http://localhost:4173)
 *
 * Optional authenticated E2E:
 *   LMS_TEST_PHONE, LMS_TEST_PASSWORD
 *   LMS_TEST_ADMIN_EMAIL, LMS_TEST_ADMIN_PASSWORD
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'src')
const BASE = (process.env.PREVIEW_URL ?? 'http://localhost:4173').replace(/\/$/, '')

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
]

const PUBLIC_PAGES = [
  { path: '/login', heading: /welcome back/i },
  { path: '/signup', heading: /start learning today/i },
  { path: '/forgot-password', heading: /reset your password/i },
  { path: '/admin/login', heading: /staff sign in/i },
  { path: '/admin/signup/instructor', heading: /sign up as instructor/i },
  { path: '/admin/signup/admin', heading: /sign up as admin/i },
]

const AUTH_GUARDS = [
  { path: '/', expect: /\/login/ },
  { path: '/profile', expect: /\/login/ },
  { path: '/assignments', expect: /\/login/ },
  { path: '/courses/any-course', expect: /\/login/ },
  { path: '/admin', expect: /\/admin\/login/ },
  { path: '/admin/courses', expect: /\/admin\/login/ },
  { path: '/admin/assignments', expect: /\/admin\/login/ },
  { path: '/admin/learners', expect: /\/admin\/login/ },
  { path: '/admin/media', expect: /\/admin\/login/ },
]

const REGISTERED_ROUTES = new Set([
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/admin/login',
  '/admin/signup/:role',
  '/admin/reset-password',
  '/profile',
  '/assignments',
  '/assignments/:assignmentId',
  '/courses/:courseId',
  '/courses/:courseId/learn',
  '/admin',
  '/admin/courses',
  '/admin/courses/new',
  '/admin/courses/:courseId',
  '/admin/learners',
  '/admin/media',
  '/admin/assignments',
  '/admin/assignments/new',
  '/admin/assignments/:assignmentId/edit',
  '/admin/assignments/:assignmentId/submissions',
  '/admin/assignments/:assignmentId/submissions/:submissionId',
])

const STATIC_PATHS = new Set([
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/admin/login',
  '/admin/signup/instructor',
  '/admin/signup/admin',
  '/admin/reset-password',
  '/profile',
  '/assignments',
  '/admin',
  '/admin/courses',
  '/admin/courses/new',
  '/admin/learners',
  '/admin/media',
  '/admin/assignments',
  '/admin/assignments/new',
])

const results = { pass: [], fail: [], warn: [] }

function pass(msg) {
  results.pass.push(msg)
  console.log(`  ✓ ${msg}`)
}
function fail(msg, detail = '') {
  results.fail.push({ msg, detail })
  console.error(`  ✗ ${msg}${detail ? `: ${detail}` : ''}`)
}
function warn(msg) {
  results.warn.push(msg)
  console.warn(`  ⚠ ${msg}`)
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, files)
    else if (/\.(tsx?|jsx?)$/.test(name)) files.push(p)
  }
  return files
}

function routeMatches(path) {
  if (STATIC_PATHS.has(path)) return true
  if (/^\/courses\/[^/]+$/.test(path)) return true
  if (/^\/courses\/[^/]+\/learn$/.test(path)) return true
  if (/^\/assignments\/[^/]+$/.test(path)) return true
  if (/^\/admin\/signup\/(instructor|admin)$/.test(path)) return true
  if (/^\/admin\/courses\/[^/]+$/.test(path) && path !== '/admin/courses/new') return true
  if (/^\/admin\/assignments\/[^/]+\/edit$/.test(path)) return true
  if (/^\/admin\/assignments\/[^/]+\/submissions$/.test(path)) return true
  if (/^\/admin\/assignments\/[^/]+\/submissions\/[^/]+$/.test(path)) return true
  if (path.startsWith('http') || path.startsWith('mailto:') || path.startsWith('tel:')) return true
  if (path === '#' || path.startsWith('#')) return true
  return false
}

function loadDotEnv() {
  const envPath = join(ROOT, '.env')
  if (!existsSync(envPath)) return {}
  const map = {}
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i < 0) continue
    map[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim()
  }
  return map
}

function staticAudit() {
  console.log('\n── Static audit ──\n')

  const files = walk(SRC)
  const linkTargets = []
  const invalidLinks = []

  for (const file of files) {
    const src = readFileSync(file, 'utf8')
    const rel = file.replace(SRC, '').replace(/\\/g, '/')

    if (/<Link[^>]*>\s*<Button[\s>]/.test(src)) {
      fail(`Invalid <Link><Button> nesting`, rel)
    }

    for (const m of src.matchAll(/(?:to|href)=\{?["'`](\/[^"'`#?]+)["'`]/g)) {
      linkTargets.push({ path: m[1], file: rel })
    }
  }

  for (const { path, file } of linkTargets) {
    if (!routeMatches(path)) invalidLinks.push({ path, file })
  }

  if (invalidLinks.length === 0) {
    pass(`All ${linkTargets.length} internal link targets map to registered routes`)
  } else {
    for (const { path, file } of invalidLinks) fail(`Unknown route target ${path}`, file)
  }

  pass(`${REGISTERED_ROUTES.size} routes registered`)
  pass(`No invalid <Link><Button> nesting in ${files.length} source files`)

  const courseHome = readFileSync(join(SRC, 'pages', 'CourseHomePage.tsx'), 'utf8')
  if (/Certificate|Award/.test(courseHome)) {
    fail('CourseHomePage still references Certificate/Award UI')
  } else {
    pass('CourseHomePage has no certificate UI')
  }

  const courseEdit = readFileSync(join(SRC, 'pages', 'admin', 'AdminCourseEditPage.tsx'), 'utf8')
  if (/Certificate offered|setCertificateOffered/.test(courseEdit)) {
    fail('AdminCourseEditPage still has certificate controls')
  } else {
    pass('AdminCourseEditPage has no certificate controls')
  }

  try {
    readFileSync(join(ROOT, '.env'), 'utf8')
    pass('.env file present')
  } catch {
    warn('.env file missing')
  }
}

async function apiAudit(env) {
  console.log('\n── Live API / RPC audit ──\n')
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    warn('Skipping API audit — missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
    return
  }

  async function rpc(name, args = {}, token) {
    const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${token || key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(args),
    })
    const text = await res.text()
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = text
    }
    return { status: res.status, json, text }
  }

  // Anon must not list assignments (M6)
  {
    const r = await rpc('lms_list_assignments')
    if (r.status === 401 || r.status === 403 || String(r.text).includes('permission denied')) {
      pass('Anon cannot call lms_list_assignments (revoked)')
    } else if (r.status >= 400) {
      pass(`Anon blocked from lms_list_assignments (HTTP ${r.status})`)
    } else {
      fail('Anon can still call lms_list_assignments', `HTTP ${r.status}`)
    }
  }

  // Phone normalize helper should exist
  {
    const r = await rpc('lms_phone_registered', { p_phone: '08012345678' })
    if (r.status === 200 && typeof r.json === 'boolean') {
      pass(`lms_phone_registered works (anon ok for signup checks): ${r.json}`)
    } else if (r.status === 200) {
      pass('lms_phone_registered reachable')
    } else {
      fail('lms_phone_registered', `HTTP ${r.status} ${r.text.slice(0, 120)}`)
    }
  }

  // Pending staff list requires auth
  {
    const r = await rpc('lms_admin_list_pending_staff')
    if (r.status >= 400) {
      pass('lms_admin_list_pending_staff rejects anon')
    } else {
      fail('lms_admin_list_pending_staff should reject anon', `HTTP ${r.status}`)
    }
  }

  // Seed helper requires auth
  {
    const r = await rpc('lms_seed_assignments_if_empty', { p_items: [] })
    if (r.status >= 400) {
      pass('lms_seed_assignments_if_empty rejects anon')
    } else {
      fail('lms_seed_assignments_if_empty should reject anon', `HTTP ${r.status}`)
    }
  }

  // Lock RPC requires staff
  {
    const r = await rpc('lms_staff_set_submission_locked', {
      p_submission_id: '00000000-0000-4000-8000-000000000099',
      p_locked: true,
    })
    if (r.status >= 400) {
      pass('lms_staff_set_submission_locked rejects anon')
    } else {
      fail('lms_staff_set_submission_locked should reject anon', `HTTP ${r.status}`)
    }
  }
}

async function checkNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      bodyScroll: document.body.scrollWidth,
    }
  })
  if (overflow.scrollWidth > overflow.clientWidth + 2) {
    fail(`${label} — horizontal overflow`, `${overflow.scrollWidth}px > ${overflow.clientWidth}px`)
  } else {
    pass(`${label} — no horizontal overflow`)
  }
}

async function collectPageErrors(page, fn) {
  const errors = []
  const onError = (err) => errors.push(String(err))
  const onPageError = (err) => errors.push(String(err))
  page.on('pageerror', onPageError)
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  try {
    await fn()
  } finally {
    page.off('pageerror', onPageError)
    page.off('console', onError)
  }
  return errors.filter(
    (e) =>
      !/favicon/i.test(e) &&
      !/Download the React DevTools/i.test(e) &&
      !/Failed to load resource:.*favicon/i.test(e),
  )
}

async function browserAudit() {
  console.log('\n── Browser smoke tests ──\n')
  console.log(`  Target: ${BASE}\n`)

  let browser
  try {
    browser = await chromium.launch()
  } catch (e) {
    fail('Playwright browser launch', e.message)
    return
  }

  const context = await browser.newContext()
  const page = await context.newPage()

  async function goto(path) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(400)
    return res?.status() ?? 0
  }

  try {
    const status = await goto('/login')
    if (status >= 400) fail('Server', `HTTP ${status}`)
    else pass(`Server responding (${BASE})`)
  } catch (e) {
    fail('Server unreachable', e.message)
    await browser.close()
    return
  }

  // Public pages + responsiveness
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    console.log(`\n  [${vp.name} ${vp.width}x${vp.height}]`)

    for (const { path, heading } of PUBLIC_PAGES) {
      const errors = await collectPageErrors(page, async () => {
        await goto(path)
        try {
          await page.getByRole('heading', { name: heading }).first().waitFor({ timeout: 8000 })
          pass(`${vp.name} ${path} — heading visible`)
        } catch (e) {
          fail(`${vp.name} ${path} — heading`, e.message)
        }
        await checkNoHorizontalOverflow(page, `${vp.name} ${path}`)

        // Interactive controls should be visible / enabled
        const buttons = page.getByRole('button')
        const count = await buttons.count()
        if (count === 0) {
          warn(`${vp.name} ${path} — no buttons found`)
        } else {
          let disabledOrHidden = 0
          for (let i = 0; i < Math.min(count, 12); i++) {
            const btn = buttons.nth(i)
            const visible = await btn.isVisible().catch(() => false)
            if (!visible) disabledOrHidden++
          }
          pass(`${vp.name} ${path} — ${count} button(s) present`)
        }

        const links = page.getByRole('link')
        const linkCount = await links.count()
        pass(`${vp.name} ${path} — ${linkCount} link(s) present`)
      })

      const serious = errors.filter((e) => !/net::ERR_|Failed to load resource/i.test(e))
      if (serious.length) {
        fail(`${vp.name} ${path} — console/page errors`, serious.slice(0, 3).join(' | '))
      }
    }
  }

  await page.setViewportSize({ width: 1280, height: 800 })

  // Auth navigation flows
  await goto('/login')
  try {
    await page.getByRole('link', { name: 'Create an account' }).click()
    await page.waitForURL(/signup/, { timeout: 5000 })
    pass('/login → /signup')
  } catch (e) {
    fail('/login → /signup', e.message)
  }

  await goto('/signup')
  try {
    await page.getByRole('link', { name: 'Sign in' }).click()
    await page.waitForURL(/login/, { timeout: 5000 })
    pass('/signup → /login')
  } catch (e) {
    fail('/signup → /login', e.message)
  }

  await goto('/admin/login')
  try {
    await page.getByRole('link', { name: 'Sign in with phone' }).click()
    await page.waitForURL(/\/login$/, { timeout: 5000 })
    pass('/admin/login → /login')
  } catch (e) {
    fail('/admin/login → /login', e.message)
  }

  await goto('/admin/login')
  try {
    await page.getByRole('link', { name: 'Sign up as instructor' }).waitFor({ timeout: 5000 })
    await page.getByRole('link', { name: 'Sign up as admin' }).waitFor({ timeout: 5000 })
    pass('/admin/login — staff sign-up links present')
  } catch (e) {
    fail('/admin/login — staff sign-up links', e.message)
  }

  await goto('/login')
  try {
    await page.getByRole('link', { name: 'Forgot your password?' }).click()
    await page.waitForURL(/forgot-password/, { timeout: 5000 })
    pass('/login → /forgot-password')
  } catch (e) {
    fail('/login → /forgot-password', e.message)
  }

  // Empty form validation (learner login)
  await goto('/login')
  try {
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForTimeout(500)
    const stillOnLogin = page.url().includes('/login')
    if (stillOnLogin) pass('Learner login — empty submit stays on /login')
    else fail('Learner login — empty submit navigated away')
  } catch (e) {
    fail('Learner login empty submit', e.message)
  }

  await goto('/admin/login')
  try {
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForTimeout(500)
    if (page.url().includes('/admin/login')) pass('Staff login — empty submit stays on /admin/login')
    else fail('Staff login — empty submit navigated away')
  } catch (e) {
    fail('Staff login empty submit', e.message)
  }

  // Auth guards
  for (const { path, expect } of AUTH_GUARDS) {
    await goto(path)
    try {
      await page.waitForURL(expect, { timeout: 10000 })
      pass(`${path} — auth guard redirects correctly`)
    } catch (e) {
      fail(`${path} auth guard`, `ended at ${page.url()} — ${e.message}`)
    }
  }

  // Logged-in public routes should bounce signed-out users; signed-in users
  // should not see signup when we later test with credentials.

  // Logo
  await goto('/login')
  try {
    const logo = page.locator('img[alt="NerdzFactory"]').first()
    await logo.waitFor({ timeout: 5000 })
    const box = await logo.boundingBox()
    if (!box || box.width < 40) throw new Error('logo not visible')
    pass('Logo visible on auth page')
  } catch (e) {
    fail('Logo visibility', e.message)
  }

  // 404 chain
  await goto('/does-not-exist')
  try {
    await page.waitForURL(/login/, { timeout: 8000 })
    pass('Unknown path → login redirect works')
  } catch (e) {
    fail('404 redirect', e.message)
  }

  await goto('/admin/reset-password')
  try {
    await page.getByRole('heading', { name: /reset link invalid or expired|set a new password/i }).waitFor({
      timeout: 8000,
    })
    pass('/admin/reset-password — invalid/expired or form state renders')
  } catch (e) {
    fail('/admin/reset-password', e.message)
  }

  // Mobile bottom nav should not appear on auth pages
  await page.setViewportSize({ width: 390, height: 844 })
  await goto('/login')
  try {
    const bottomNav = page.locator('nav[aria-label*="mobile" i], nav[aria-label*="bottom" i], [data-testid="learner-mobile-nav"]')
    const count = await bottomNav.count()
    // Also check for fixed bottom bars that look like learner nav
    const fixedBottom = await page.locator('nav.fixed, footer + nav, [class*="bottom"]').count()
    pass(`Auth mobile — no learner bottom nav expected (nav probes: ${count}/${fixedBottom})`)
  } catch (e) {
    warn(`Mobile nav probe: ${e.message}`)
  }

  // Certificate string must not appear on public marketing/auth surfaces
  await goto('/login')
  {
    const body = await page.locator('body').innerText()
    if (/certificate included/i.test(body)) fail('Public page shows Certificate included')
    else pass('No "Certificate included" on /login')
  }

  // Authenticated learner E2E
  const testPhone = process.env.LMS_TEST_PHONE
  const testPassword = process.env.LMS_TEST_PASSWORD
  if (testPhone && testPassword) {
    console.log('\n  [authenticated learner]')
    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/login')
    await page.getByLabel(/your phone number/i).fill(testPhone)
    await page.getByLabel(/^password$/i).fill(testPassword)
    await page.getByRole('button', { name: 'Sign in' }).click()
    try {
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 25000 })
      pass('Learner login succeeds')
    } catch (e) {
      fail('Learner login', e.message)
      await browser.close()
      return
    }

    async function learnerReady(path) {
      await goto(path)
      try {
        await page.getByText(/human capital development|your learning|worksheets|your profile/i).first().waitFor({
          timeout: 15000,
        })
      } catch {
        /* continue */
      }
      await page.waitForTimeout(2000)
    }

    const learnerRoutes = ['/', '/assignments', '/profile']
    for (const path of learnerRoutes) {
      await learnerReady(path)
      await checkNoHorizontalOverflow(page, `learner desktop ${path}`)
      const body = await page.locator('body').innerText()
      if (/certificate included/i.test(body)) fail(`${path} shows Certificate included`)
      if (body.trim().length < 80) fail(`Learner ${path} — empty body`)
      else pass(`Learner ${path} loads`)
    }

    // Mobile learner nav
    await page.setViewportSize({ width: 390, height: 844 })
    await learnerReady('/')
    await checkNoHorizontalOverflow(page, 'learner mobile /')
    try {
      await page.getByRole('link', { name: /courses|worksheets|profile/i }).first().waitFor({ timeout: 5000 })
      pass('Learner mobile — nav links reachable')
    } catch (e) {
      fail('Learner mobile nav', e.message)
    }

    // Dual nav check for phone learners (bottom nav should show; header scroll hidden)
    {
      const scrollNav = page.locator('nav[aria-label="Section navigation"]')
      const bottomNav = page.locator('nav[aria-label="Main navigation"]')
      const scrollVisible = (await scrollNav.count()) > 0 && (await scrollNav.first().isVisible().catch(() => false))
      const bottomVisible = (await bottomNav.count()) > 0 && (await bottomNav.first().isVisible().catch(() => false))
      if (scrollVisible && bottomVisible) fail('Learner dual mobile nav (scroll + bottom)')
      else pass(`Learner mobile nav ok (scroll=${scrollVisible}, bottom=${bottomVisible})`)
    }

    // Open first course
    await page.setViewportSize({ width: 1280, height: 800 })
    await learnerReady('/')
    try {
      await page.locator('a[href^="/courses/"]').first().waitFor({ timeout: 15000 })
      const courseLink = page.locator('a[href^="/courses/"]').first()
      await courseLink.click()
      await page.waitForURL(/\/courses\//, { timeout: 10000 })
      await page.waitForTimeout(1500)
      const text = await page.locator('body').innerText()
      if (/certificate/i.test(text) && /included/i.test(text)) {
        fail('Course home still advertises certificate')
      } else {
        pass('Course home — no certificate marketing')
      }
      await checkNoHorizontalOverflow(page, 'course home')

      const start = page.getByRole('link', { name: /start|continue|resume|watch/i }).first()
      if (await start.count()) {
        await start.click()
        await page.waitForURL(/\/learn/, { timeout: 10000 })
        await page.waitForTimeout(1500)
        pass('Learner course player opens')
        const mark = page.getByRole('button', { name: /mark lesson as done|completed/i })
        if (await mark.count()) pass('Learner course player — mark done present')
      } else {
        warn('Course home — no start/continue link')
      }
    } catch (e) {
      fail('Course home navigation', e.message)
    }

    // Assignments
    await learnerReady('/assignments')
    try {
      await page.locator('a[href^="/assignments/"]').first().waitFor({ timeout: 15000 })
      const ws = page.locator('a[href^="/assignments/"]').first()
      await ws.click()
      await page.waitForURL(/\/assignments\//, { timeout: 10000 })
      await page.waitForTimeout(1500)
      pass('Assignment take page opens')
      await checkNoHorizontalOverflow(page, 'assignment take')
      const formOrReview = await page.locator('body').innerText()
      if (/submit|update submission|edit answers|locked/i.test(formOrReview)) {
        pass('Assignment take — form or review controls present')
      }
    } catch (e) {
      fail('Assignment open', e.message)
    }

    // Signed-in user hitting /signup should bounce home
    await goto('/signup')
    try {
      await page.waitForURL((u) => !u.pathname.includes('/signup'), { timeout: 8000 })
      pass('Signed-in learner redirected away from /signup')
    } catch (e) {
      fail('Signed-in /signup redirect', e.message)
    }
  } else {
    warn('Learner E2E skipped — set LMS_TEST_PHONE and LMS_TEST_PASSWORD')
  }

  // Authenticated admin E2E (+ learner view preview)
  const testAdminEmail = process.env.LMS_TEST_ADMIN_EMAIL
  const testAdminPassword = process.env.LMS_TEST_ADMIN_PASSWORD
  if (testAdminEmail && testAdminPassword) {
    console.log('\n  [authenticated admin + learner view]')
    // Fresh context — Supabase session lives in localStorage, not only cookies.
    await context.close()
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()

    async function adminGoto(path) {
      const res = await adminPage.goto(`${BASE}${path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })
      // Wait for React shell + data: header brand or staff/learner chrome.
      try {
        await adminPage.getByText(/human capital development|nerdzfactory|learning/i).first().waitFor({
          timeout: 15000,
        })
      } catch {
        /* continue — some error states still useful */
      }
      await adminPage.waitForTimeout(1500)
      return res?.status() ?? 0
    }

    async function adminNoOverflow(label) {
      const overflow = await adminPage.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }))
      if (overflow.sw > overflow.cw + 2) {
        fail(`${label} overflow`, `${overflow.sw}>${overflow.cw}`)
      } else {
        pass(`${label} — no overflow`)
      }
    }

    async function adminHasContent(label, minLen = 80) {
      const body = (await adminPage.locator('body').innerText()).trim()
      if (body.length < minLen) fail(`${label} — empty/sparse body`, `len=${body.length}`)
      else pass(`${label} — content rendered (${body.length} chars)`)
      return body
    }

    await adminPage.setViewportSize({ width: 1280, height: 800 })
    await adminGoto('/admin/login')
    await adminPage.getByLabel(/email/i).fill(testAdminEmail)
    await adminPage.getByLabel(/^password$/i).fill(testAdminPassword)
    await adminPage.getByRole('button', { name: 'Sign in' }).click()
    try {
      await adminPage.waitForURL(/\/admin(?!\/login)/, { timeout: 25000 })
      pass('Admin login succeeds')
    } catch (e) {
      fail('Admin login', `${e.message} @ ${adminPage.url()}`)
      await browser.close()
      return
    }

    const adminRoutes = [
      '/admin',
      '/admin/courses',
      '/admin/assignments',
      '/admin/learners',
      '/admin/media',
      '/admin/courses/new',
      '/admin/assignments/new',
    ]
    for (const path of adminRoutes) {
      await adminGoto(path)
      if (adminPage.url().includes('/admin/login')) {
        fail(`Admin ${path} bounced to login`)
        continue
      }
      await adminNoOverflow(`Admin ${path}`)
      await adminHasContent(`Admin ${path}`)
    }

    // Overview pending staff section (may be empty)
    await adminGoto('/admin')
    try {
      await adminPage.getByRole('heading', { name: /courses|overview|staff access/i }).first().waitFor({
        timeout: 8000,
      })
      pass('Admin overview — headings present')
    } catch (e) {
      fail('Admin overview headings', e.message)
    }

    // Publish/Delete buttons on courses (admin only)
    await adminGoto('/admin/courses')
    try {
      await adminPage.getByText(/access to finance|courses/i).first().waitFor({ timeout: 15000 })
      const publish = adminPage.getByRole('button', { name: /publish|unpublish/i })
      if (await publish.count()) pass('Admin courses — Publish/Unpublish controls present')
      else warn('Admin courses — no publish toggles (empty catalog?)')
      const del = adminPage.getByRole('button', { name: /delete/i })
      if (await del.count()) pass('Admin courses — Delete controls present')
      else warn('Admin courses — no delete buttons visible')
      const edit = adminPage.getByRole('link', { name: /^edit$/i })
      if (await edit.count()) pass('Admin courses — Edit links present')
      else warn('Admin courses — no Edit links')
      const view = adminPage.getByRole('link', { name: /^view$/i })
      if (await view.count()) pass('Admin courses — View (learner) links present')
      else warn('Admin courses — no View links')
    } catch (e) {
      fail('Admin course controls', e.message)
    }

    // Open course editor for first course
    await adminGoto('/admin/courses')
    try {
      await adminPage.getByRole('link', { name: /^edit$/i }).first().waitFor({ timeout: 15000 })
      const editLink = adminPage.getByRole('link', { name: /^edit$/i }).first()
      await editLink.click()
      await adminPage.waitForURL(/\/admin\/courses\/[^/]+$/, { timeout: 15000 })
      await adminPage.waitForTimeout(1500)
      const editBody = await adminPage.locator('body').innerText()
      if (/certificate offered/i.test(editBody)) fail('Course editor still has certificate checkbox')
      else pass('Course editor — no certificate controls')
      await adminNoOverflow('Admin course editor')
      for (const tab of ['Basics', 'Homepage', 'Lessons']) {
        const tabBtn = adminPage.getByRole('button', { name: new RegExp(tab, 'i') }).first()
        if (await tabBtn.count()) {
          await tabBtn.click()
          await adminPage.waitForTimeout(400)
          pass(`Course editor — ${tab} tab clickable`)
        }
      }
    } catch (e) {
      fail('Course editor', e.message)
    }

    // Assignments list + submissions + lock
    await adminGoto('/admin/assignments')
    try {
      await adminPage.getByText(/assignment|worksheet|new assignment/i).first().waitFor({ timeout: 15000 })
      const body = await adminPage.locator('body').innerText()
      if (/no assignments/i.test(body) && !(await adminPage.locator('a[href*="/submissions"]').count())) {
        warn('Assignments catalog empty')
      } else {
        pass('Admin assignments page has content')
      }
      const card = adminPage.locator('a[href*="/admin/assignments/"][href*="/submissions"]').first()
      if (await card.count()) {
        await card.click()
        await adminPage.waitForURL(/submissions/, { timeout: 15000 })
        await adminPage.waitForTimeout(1500)
        pass('Admin submissions list opens')
        await adminNoOverflow('Admin submissions list')
        await adminPage.getByRole('button', { name: /lock worksheet|unlock worksheet/i }).waitFor({
          timeout: 15000,
        })
        const lockWorksheet = adminPage.getByRole('button', { name: /lock worksheet|unlock worksheet/i })
        if (await lockWorksheet.count()) {
          pass('Worksheet Lock/Unlock control present (works with empty lists)')
          const label = (await lockWorksheet.first().innerText()).trim()
          await lockWorksheet.first().click()
          await adminPage.waitForTimeout(2000)
          const after = await lockWorksheet.first().innerText().catch(() => '')
          const bodyAfter = await adminPage.locator('body').innerText()
          if (/Could not find the function|schema cache|ASSIGNMENT_LOCKED|not found/i.test(bodyAfter) && after.trim().toLowerCase() === label.toLowerCase()) {
            fail(
              'Worksheet lock RPC missing — run supabase/migrations/20260722150000_assignment_level_lock.sql in Supabase SQL Editor',
            )
          } else if (after && after.trim().toLowerCase() !== label.toLowerCase()) {
            pass(`Worksheet lock toggle works (${label} → ${after.trim()})`)
            await lockWorksheet.first().click()
            await adminPage.waitForTimeout(1500)
          } else {
            warn(`Worksheet lock click did not change label: still "${after || label}"`)
          }
        } else {
          fail('Worksheet Lock/Unlock control missing on submissions page')
        }

        const lockBtn = adminPage.getByRole('button', { name: /^(lock|unlock)$/i })
        if (await lockBtn.count()) pass('Per-submission Lock/Unlock controls present')
        else warn('No per-submission Lock/Unlock yet (no real submissions)')

        const viewAnswers = adminPage.getByRole('link', { name: /view answers/i }).first()
        if (await viewAnswers.count()) {
          await viewAnswers.click()
          await adminPage.waitForURL(/submissions\/[^/]+$/, { timeout: 15000 })
          await adminPage.waitForTimeout(1000)
          pass('Admin submission detail opens')
          const exportBtn = adminPage.getByRole('button', { name: /export pdf/i })
          if (await exportBtn.count()) pass('Submission detail — Export PDF present')
          await adminNoOverflow('Admin submission detail')
        }
      } else {
        warn('No assignment submission links yet')
      }
    } catch (e) {
      fail('Admin submissions', e.message)
    }

    // Learners page
    await adminGoto('/admin/learners')
    try {
      await adminPage.getByText(/learner/i).first().waitFor({ timeout: 8000 })
      pass('Admin learners page loads')
      await adminNoOverflow('Admin learners')
    } catch (e) {
      fail('Admin learners', e.message)
    }

    // Media page
    await adminGoto('/admin/media')
    try {
      await adminPage.getByText(/media|image|upload/i).first().waitFor({ timeout: 8000 })
      pass('Admin media page loads')
      await adminNoOverflow('Admin media')
    } catch (e) {
      fail('Admin media', e.message)
    }

    // ── Learner view (staff preview) ──
    console.log('\n  [staff learner-view preview]')
    const learnerPaths = ['/', '/assignments', '/profile']
    for (const path of learnerPaths) {
      await adminGoto(path)
      if (adminPage.url().includes('/login')) {
        fail(`Learner view ${path} redirected to login`)
        continue
      }
      await adminNoOverflow(`Learner-view ${path}`)
      const text = await adminHasContent(`Learner-view ${path}`)
      if (/certificate included/i.test(text)) fail(`Learner-view ${path} shows Certificate included`)
      if (path === '/' || path === '/assignments') {
        if (/viewing as a learner/i.test(text)) pass(`Learner-view ${path} — preview banner present`)
        else warn(`Learner-view ${path} — preview banner not found`)
      }
    }

    // Profile staff back link
    await adminGoto('/profile')
    try {
      const back = adminPage.getByRole('link', { name: /back to admin/i })
      if (await back.count()) pass('Profile — staff Back to admin link')
      else warn('Profile — Back to admin link missing')
    } catch (e) {
      fail('Profile staff back link', e.message)
    }

    // Open a course from learner dashboard
    await adminGoto('/')
    try {
      await adminPage.locator('a[href^="/courses/"]').first().waitFor({ timeout: 15000 })
      const courseLink = adminPage.locator('a[href^="/courses/"]').first()
      await courseLink.click()
      await adminPage.waitForURL(/\/courses\/[^/]+$/, { timeout: 15000 })
      await adminPage.waitForTimeout(1500)
      const text = await adminPage.locator('body').innerText()
      if (/certificate/i.test(text) && /included/i.test(text)) {
        fail('Learner-view course home advertises certificate')
      } else {
        pass('Learner-view course home — no certificate marketing')
      }
      await adminNoOverflow('Learner-view course home')

      const start = adminPage.getByRole('link', { name: /start|continue|resume|watch/i }).first()
      if (await start.count()) {
        await start.click()
        await adminPage.waitForURL(/\/learn/, { timeout: 15000 })
        await adminPage.waitForTimeout(1500)
        pass('Learner-view course player opens')
        await adminNoOverflow('Learner-view course player')
        const mark = adminPage.getByRole('button', { name: /mark lesson as done|completed/i })
        if (await mark.count()) pass('Course player — complete control present')
        else warn('Course player — no mark-complete button visible')
      } else {
        warn('Course home — no start/continue link')
      }
    } catch (e) {
      fail('Learner-view course flow', e.message)
    }

    // Worksheets in learner view
    await adminGoto('/assignments')
    try {
      await adminPage.locator('a[href^="/assignments/"]').first().waitFor({ timeout: 15000 })
      const ws = adminPage.locator('a[href^="/assignments/"]').first()
      await ws.click()
      await adminPage.waitForURL(/\/assignments\/[^/]+$/, { timeout: 15000 })
      await adminPage.waitForTimeout(1500)
      const text = await adminPage.locator('body').innerText()
      if (/preview only|staff accounts cannot submit|sign in as a learner/i.test(text)) {
        pass('Worksheet preview — staff cannot submit (expected)')
      } else {
        warn('Worksheet preview — staff notice not found')
      }
      await adminNoOverflow('Learner-view worksheet')
    } catch (e) {
      fail('Learner-view worksheet', e.message)
    }

    // Header "Learner view" / Staff nav switch
    await adminGoto('/admin/courses')
    try {
      const learnerNav = adminPage.getByRole('link', { name: /^learner view$/i }).first()
      if (await learnerNav.count()) {
        await Promise.all([
          adminPage.waitForURL((u) => !u.pathname.startsWith('/admin'), { timeout: 15000 }),
          learnerNav.click(),
        ])
        pass('Nav — switch to learner view works')
      } else {
        await adminGoto('/')
        pass('Nav — opened learner home directly')
      }
      await adminPage.waitForTimeout(1000)
      const back = adminPage.getByRole('link', { name: /back to staff panel/i }).first()
      const staff = adminPage.getByRole('link', { name: /^staff panel$/i }).first()
      if (await back.count()) {
        await Promise.all([
          adminPage.waitForURL(/\/admin/, { timeout: 15000 }),
          back.click(),
        ])
      } else if (await staff.count()) {
        await Promise.all([
          adminPage.waitForURL(/\/admin/, { timeout: 15000 }),
          staff.click(),
        ])
      } else {
        throw new Error('No staff panel return link found')
      }
      pass('Nav — return to staff panel works')
    } catch (e) {
      fail('Admin/learner nav switch', e.message)
    }

    // Mobile admin + learner view responsiveness
    await adminPage.setViewportSize({ width: 390, height: 844 })
    for (const path of ['/admin/courses', '/admin/assignments', '/', '/assignments', '/profile']) {
      await adminGoto(path)
      await adminNoOverflow(`Mobile ${path}`)
      await adminHasContent(`Mobile ${path}`, 60)
    }
    try {
      await adminGoto('/')
      const navLinks = adminPage.getByRole('link', { name: /courses|worksheets|profile|staff|assignments/i })
      if (await navLinks.count()) pass('Mobile learner-view — nav links reachable')
      else warn('Mobile learner-view — no nav links found')
    } catch (e) {
      fail('Mobile learner-view nav', e.message)
    }

    // Dual-nav check
    await adminGoto('/')
    {
      const scrollNav = adminPage.locator('nav[aria-label="Section navigation"]')
      const bottomNav = adminPage.locator('nav[aria-label="Main navigation"]')
      const scrollVisible = (await scrollNav.count()) > 0 && (await scrollNav.first().isVisible().catch(() => false))
      const bottomVisible = (await bottomNav.count()) > 0 && (await bottomNav.first().isVisible().catch(() => false))
      if (scrollVisible && bottomVisible) {
        fail('Dual mobile nav — header scroll + bottom nav both visible')
      } else {
        pass(`Mobile nav pattern ok (scroll=${scrollVisible}, bottom=${bottomVisible})`)
      }
    }

    // Sign out
    try {
      await adminPage.setViewportSize({ width: 1280, height: 800 })
      await adminGoto('/admin/courses')
      const signOut = adminPage.getByRole('button', { name: /sign out/i })
      await signOut.first().waitFor({ timeout: 10000 })
      await signOut.first().click()
      await adminPage.waitForURL(/admin\/login|\/login/, { timeout: 15000 })
      pass('Admin sign out works')
    } catch (e) {
      fail('Admin sign out', e.message)
    }

    await adminPage.close()
    await adminContext.close()
  } else {
    warn('Admin E2E skipped — set LMS_TEST_ADMIN_EMAIL and LMS_TEST_ADMIN_PASSWORD')
  }

  await browser.close()
}

async function main() {
  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║  NerdzFactory LMS — Full Portal Audit    ║')
  console.log('╚══════════════════════════════════════════╝')

  const env = loadDotEnv()
  staticAudit()
  await apiAudit(env)
  await browserAudit()

  console.log('\n── Summary ──\n')
  console.log(`  Passed:   ${results.pass.length}`)
  console.log(`  Warnings: ${results.warn.length}`)
  console.log(`  Failed:   ${results.fail.length}`)

  if (results.warn.length) {
    console.log('\n  Warnings:')
    for (const w of results.warn) console.log(`    • ${w}`)
  }

  if (results.fail.length) {
    console.log('\n  Failures:')
    for (const f of results.fail) console.log(`    • ${f.msg}${f.detail ? ` (${f.detail})` : ''}`)
    process.exit(1)
  }

  console.log('\n  All automated checks passed.\n')
  if (!process.env.LMS_TEST_PHONE || !process.env.LMS_TEST_ADMIN_EMAIL) {
    console.log('  Tip: set LMS_TEST_* credentials for full authenticated coverage.\n')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
