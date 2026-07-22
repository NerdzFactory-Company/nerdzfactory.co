import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'

/** Sign out after this much time with no user activity. */
const IDLE_LIMIT_MS = 10 * 60 * 1000
/** How often we compare "now" against the last activity timestamp. */
const CHECK_INTERVAL_MS = 15 * 1000
/** Shared across tabs so activity in one tab keeps the others alive. */
const LAST_ACTIVITY_KEY = 'nf-lms-last-activity'

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const

function readStoredActivity(): number {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY)
    const parsed = raw ? Number(raw) : NaN
    return Number.isFinite(parsed) ? parsed : 0
  } catch {
    return 0
  }
}

/**
 * Signs the user out after {@link IDLE_LIMIT_MS} of inactivity and shows a
 * popup explaining why. Covers all three cases:
 *  - the tab stays open but the user does nothing for 10 minutes
 *  - the tab/browser is hidden or asleep and the user comes back later
 *  - the browser was closed and reopened after the idle limit
 */
export function InactivityGuard() {
  const { user, signOut } = useAuth()
  const [showModal, setShowModal] = useState(false)
  // 0 = no activity seen this page load; real timestamps come from events.
  const lastActivityRef = useRef(0)
  const lastPersistRef = useRef(0)
  const signingOutRef = useRef(false)
  const userSignedIn = !!user

  const handleExpired = useCallback(async () => {
    if (signingOutRef.current) return
    signingOutRef.current = true
    setShowModal(true)
    try {
      localStorage.removeItem(LAST_ACTIVITY_KEY)
    } catch {
      /* ignore */
    }
    try {
      await signOut()
    } finally {
      signingOutRef.current = false
    }
  }, [signOut])

  // Track activity on every page (including login), so typing credentials
  // counts as activity and a fresh sign-in never looks stale.
  useEffect(() => {
    const markActivity = () => {
      const now = Date.now()
      lastActivityRef.current = now
      // localStorage writes are comparatively slow — persist at most every 5s.
      if (now - lastPersistRef.current > 5000) {
        lastPersistRef.current = now
        try {
          localStorage.setItem(LAST_ACTIVITY_KEY, String(now))
        } catch {
          /* storage full/blocked — the in-memory timestamp still works */
        }
      }
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActivity, { passive: true })
    }
    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActivity)
      }
    }
  }, [])

  // Watch for the idle limit while signed in.
  useEffect(() => {
    if (!userSignedIn) return

    const lastActivity = () => Math.max(lastActivityRef.current, readStoredActivity())

    const checkIdle = () => {
      const last = lastActivity()
      if (last && Date.now() - last >= IDLE_LIMIT_MS) void handleExpired()
    }

    // Reopened browser with a restored session: if the last recorded activity
    // is older than the limit, the session expires immediately. If there is no
    // record at all, start the clock now.
    if (!lastActivity()) {
      lastActivityRef.current = Date.now()
    }
    checkIdle()

    // Background timers are throttled while a tab is hidden, so also check the
    // moment the user comes back to the tab.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkIdle()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', checkIdle)

    const interval = window.setInterval(checkIdle, CHECK_INTERVAL_MS)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', checkIdle)
      window.clearInterval(interval)
    }
  }, [userSignedIn, handleExpired])

  if (!showModal) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="inactivity-title"
    >
      <div className="w-full max-w-sm animate-fade-in rounded-2xl border border-border bg-surface p-6 text-center shadow-elevated">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Clock className="h-6 w-6" />
        </div>
        <h2 id="inactivity-title" className="mt-4 text-lg font-bold text-fg">
          You&apos;ve been signed out
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          For your security, we signed you out after 10 minutes of inactivity. Please sign in
          again to continue.
        </p>
        <Button className="mt-5" fullWidth pill onClick={() => setShowModal(false)}>
          OK, got it
        </Button>
      </div>
    </div>
  )
}
