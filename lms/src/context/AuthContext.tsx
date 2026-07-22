import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { ProfileUpdate, User } from '@/types'
import { isSupabaseAuthEnabled } from '@/lib/authMode'
import { normalizePhone } from '@/lib/phone'
import { isPhoneOtpEnabled } from '@/lib/phoneOtp'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import {
  apiAdminSignIn,
  apiAdminSignOut,
  apiStaffSignUp,
  apiAssertPhoneAuthSession,
  apiEnsureLearner,
  apiGetAdminSession,
  apiGetPhoneLearnerSession,
  apiIsPhoneRegistered,
  apiLearnerSignInWithPassword,
  apiSendPhoneOtp,
  apiUpdateAuthUserPassword,
  apiUpdateAdminProfile,
  apiUpdateLearnerProfile,
  apiVerifyPhoneOtp,
} from '@/lib/supabase/lmsApi'
import {
  clearLearnerSession,
  findUserByPhone,
  getSessionType,
  getSessionUserId,
  getUsers,
  saveUser,
  setLearnerSession,
} from '@/lib/storage'
import { formatFullName, parseLegacyName } from '@/utils/userDisplay'

export type PhoneOtpPurpose = 'signup' | 'recovery'
export type AuthFlowMode = 'none' | 'signup' | 'recovery'

interface AuthContextValue {
  user: User | null
  /** Initial auth bootstrap — blocks public auth pages on first load only. */
  bootstrapping: boolean
  /** Background session refresh — blocks protected pages only. */
  refreshing: boolean
  /** @deprecated Use `bootstrapping` on public routes. */
  loading: boolean
  isAdmin: boolean
  isInstructor: boolean
  isStaff: boolean
  isLearner: boolean
  phoneOtpEnabled: boolean
  /** Suppress learner session while completing signup or password recovery on public pages. */
  setAuthFlow: (mode: AuthFlowMode) => void
  signUp: (
    phone: string,
    firstName: string,
    lastName: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  signIn: (
    phone: string,
    password?: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  sendPhoneOtp: (
    phone: string,
    purpose?: PhoneOtpPurpose,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  verifyPhoneOtpSignUp: (
    phone: string,
    code: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  completePhoneSignUp: (
    phone: string,
    firstName: string,
    lastName: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  completePhonePasswordReset: (
    phone: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  adminSignIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>
  staffSignUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: 'instructor' | 'admin',
  ) => Promise<
    | { ok: true; pendingApproval: boolean }
    | { ok: false; error: string; needsEmailConfirmation?: boolean }
  >
  updateProfile: (profile: ProfileUpdate) => Promise<{ ok: true } | { ok: false; error: string }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function normalizeStoredUser(user: User): User {
  if (user.firstName?.trim()) return user
  const legacy = parseLegacyName(user.name)
  return {
    ...user,
    firstName: legacy.firstName,
    lastName: legacy.lastName,
    name: formatFullName(legacy.firstName, legacy.lastName) || user.name,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const authFlowRef = useRef<AuthFlowMode>('none')
  const phoneOtpEnabled = isPhoneOtpEnabled()
  const supabaseAuth = isSupabaseAuthEnabled()

  const setAuthFlow = useCallback((mode: AuthFlowMode) => {
    authFlowRef.current = mode
    if (mode !== 'none') {
      setUser(null)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    if (supabaseAuth) {
      const admin = await apiGetAdminSession()
      if (admin) {
        setUser(admin)
        return
      }

      if (authFlowRef.current !== 'none') {
        setUser(null)
        return
      }

      if (phoneOtpEnabled) {
        const phoneLearner = await apiGetPhoneLearnerSession()
        if (phoneLearner) {
          setUser(phoneLearner)
          return
        }
      }
    }

    const sessionId = getSessionUserId()
    const sessionType = getSessionType()
    if (sessionId && sessionType === 'learner' && !supabaseAuth) {
      const found = getUsers().find((u) => u.id === sessionId)
      setUser(found ? normalizeStoredUser(found) : null)
      if (!found) clearLearnerSession()
      return
    }

    setUser(null)
  }, [phoneOtpEnabled, supabaseAuth])

  useEffect(() => {
    refreshUser().finally(() => setBootstrapping(false))

    if (!supabase) return
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return
      setRefreshing(true)
      refreshUser().finally(() => setRefreshing(false))
    })
    return () => sub.subscription.unsubscribe()
  }, [refreshUser])

  const sendPhoneOtp = useCallback(
    async (rawPhone: string, purpose: PhoneOtpPurpose = 'signup') => {
      const phone = normalizePhone(rawPhone)
      if (!phone) return { ok: false as const, error: 'Please enter a valid Nigerian phone number.' }

      if (purpose === 'signup') {
        const registered = await apiIsPhoneRegistered(phone)
        if (registered) {
          return {
            ok: false as const,
            error: 'This number is already registered. Tap "Sign in" instead.',
          }
        }
      } else {
        const registered = await apiIsPhoneRegistered(phone)
        if (!registered) {
          return {
            ok: false as const,
            error: 'We could not find this number. Please sign up first.',
          }
        }
      }

      await apiAdminSignOut()
      return apiSendPhoneOtp(phone, { createUser: purpose === 'signup', purpose })
    },
    [],
  )

  const verifyPhoneOtpSignUp = useCallback(async (rawPhone: string, code: string) => {
    const phone = normalizePhone(rawPhone)
    if (!phone) return { ok: false as const, error: 'Please enter a valid Nigerian phone number.' }
    if (!code.trim()) return { ok: false as const, error: 'Please enter the 6-digit code from your SMS.' }
    return apiVerifyPhoneOtp(phone, code.trim())
  }, [])

  const completePhoneSignUp = useCallback(
    async (rawPhone: string, firstName: string, lastName: string, password: string) => {
      const phone = normalizePhone(rawPhone)
      if (!phone) return { ok: false as const, error: 'Please enter a valid Nigerian phone number.' }
      if (!firstName.trim()) return { ok: false as const, error: 'Please enter your first name.' }
      if (!lastName.trim()) return { ok: false as const, error: 'Please enter your last name.' }
      if (!password) return { ok: false as const, error: 'Please choose a password.' }

      const registered = await apiIsPhoneRegistered(phone)
      if (registered) {
        await apiAdminSignOut()
        return {
          ok: false as const,
          error: 'This number is already registered. Tap "Sign in" instead.',
        }
      }

      try {
        const learner = await apiEnsureLearner(phone, firstName.trim(), lastName.trim())
        const passwordResult = await apiUpdateAuthUserPassword(password)
        if (!passwordResult.ok) return passwordResult
        authFlowRef.current = 'none'
        setUser(learner)
        return { ok: true as const }
      } catch (e) {
        await apiAdminSignOut()
        return {
          ok: false as const,
          error:
            e instanceof Error
              ? `${e.message} Please try signing up again or contact support if this persists.`
              : 'Sign up failed. Please try again.',
        }
      }
    },
    [],
  )

  const completePhonePasswordReset = useCallback(async (rawPhone: string, password: string) => {
    const phone = normalizePhone(rawPhone)
    if (!phone) return { ok: false as const, error: 'Please enter a valid Nigerian phone number.' }
    if (!password) return { ok: false as const, error: 'Please choose a new password.' }

    const session = await apiAssertPhoneAuthSession(phone)
    if (!session.ok) return session

    const passwordResult = await apiUpdateAuthUserPassword(password)
    if (!passwordResult.ok) return passwordResult

    authFlowRef.current = 'none'
    await apiAdminSignOut()
    setUser(null)
    return { ok: true as const }
  }, [])

  const signUp = useCallback(
    async (rawPhone: string, firstName: string, lastName: string) => {
      const phone = normalizePhone(rawPhone)
      if (!phone) return { ok: false as const, error: 'Please enter a valid Nigerian phone number.' }
      if (!firstName.trim()) return { ok: false as const, error: 'Please enter your first name.' }
      if (!lastName.trim()) return { ok: false as const, error: 'Please enter your last name.' }

      if (phoneOtpEnabled) {
        return { ok: false as const, error: 'Use the Send code button to verify your phone first.' }
      }

      if (supabaseAuth) {
        // Passwordless server sign-up was removed for security — OTP is required.
        return { ok: false as const, error: 'Sign up requires phone verification. Please refresh the page and try again.' }
      }

      const existing = findUserByPhone(phone)
      if (existing) {
        return { ok: false as const, error: 'This number is already registered. Tap "Sign in" instead.' }
      }

      const newUser: User = {
        id: crypto.randomUUID(),
        phone,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: formatFullName(firstName, lastName),
        role: 'learner',
        authType: 'phone',
        createdAt: new Date().toISOString(),
      }
      saveUser(newUser)
      setLearnerSession(newUser.id)
      setUser(newUser)
      return { ok: true as const }
    },
    [phoneOtpEnabled, supabaseAuth],
  )

  const signIn = useCallback(
    async (rawPhone: string, password?: string) => {
      const phone = normalizePhone(rawPhone)
      if (!phone) return { ok: false as const, error: 'Please enter a valid Nigerian phone number.' }

      if (phoneOtpEnabled) {
        if (!password) {
          return { ok: false as const, error: 'Please enter your password.' }
        }
        await apiAdminSignOut()
        const result = await apiLearnerSignInWithPassword(phone, password)
        if (!result.ok) return result
        setUser(result.user)
        return { ok: true as const }
      }

      if (supabaseAuth) {
        // Passwordless server sign-in was removed for security — OTP is required.
        return { ok: false as const, error: 'Sign in requires phone verification. Please refresh the page and try again.' }
      }

      const existing = findUserByPhone(phone)
      if (!existing) {
        return { ok: false as const, error: 'We could not find this number. Please sign up first.' }
      }

      const normalized = normalizeStoredUser({ ...existing, authType: 'phone', role: 'learner' })
      setLearnerSession(normalized.id)
      setUser(normalized)
      return { ok: true as const }
    },
    [phoneOtpEnabled, supabaseAuth],
  )

  const adminSignIn = useCallback(async (email: string, password: string) => {
    if (!email.trim() || !password) {
      return { ok: false as const, error: 'Please enter your email and password.' }
    }
    clearLearnerSession()
    const result = await apiAdminSignIn(email.trim(), password)
    if (!result.ok) return result
    setUser(result.user)
    return { ok: true as const }
  }, [])

  const staffSignUp = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string,
      role: 'instructor' | 'admin',
    ) => {
      clearLearnerSession()
      const result = await apiStaffSignUp(email, password, firstName, lastName, role)
      if (!result.ok) return result
      if (result.pendingApproval) {
        setUser(null)
        return { ok: true as const, pendingApproval: true }
      }
      if (result.user) setUser(result.user)
      return { ok: true as const, pendingApproval: false }
    },
    [],
  )

  const updateProfile = useCallback(
    async (profile: ProfileUpdate) => {
      if (!user) return { ok: false as const, error: 'Please sign in again.' }

      try {
        if (isSupabaseConfigured()) {
          if ((user.role === 'admin' || user.role === 'instructor') && user.authType === 'email') {
            const updated = await apiUpdateAdminProfile(profile)
            setUser(updated)
            return { ok: true as const }
          }
          const updated = await apiUpdateLearnerProfile(user.id, profile)
          setUser(updated)
          if (!phoneOtpEnabled) setLearnerSession(updated.id)
          return { ok: true as const }
        }

        const updated = normalizeStoredUser({
          ...user,
          firstName: profile.firstName.trim(),
          lastName: profile.lastName.trim(),
          name: formatFullName(profile.firstName, profile.lastName),
          bio: profile.bio?.trim() ?? '',
          location: profile.location?.trim() ?? '',
          jobTitle: profile.jobTitle?.trim() ?? '',
          updatedAt: new Date().toISOString(),
        })
        saveUser(updated)
        setUser(updated)
        return { ok: true as const }
      } catch (e) {
        return {
          ok: false as const,
          error: e instanceof Error ? e.message : 'Could not save your profile.',
        }
      }
    },
    [user, phoneOtpEnabled],
  )

  const signOut = useCallback(async () => {
    clearLearnerSession()
    await apiAdminSignOut()
    setUser(null)
  }, [])

  const isAdmin = user?.role === 'admin' && user.authType === 'email'
  const isInstructor = user?.role === 'instructor' && user.authType === 'email'
  const isStaff = isAdmin || isInstructor
  const isLearner = user?.authType === 'phone'

  const value = useMemo(
    () => ({
      user,
      bootstrapping,
      refreshing,
      loading: bootstrapping,
      isAdmin,
      isInstructor,
      isStaff,
      isLearner,
      phoneOtpEnabled,
      setAuthFlow,
      signUp,
      signIn,
      sendPhoneOtp,
      verifyPhoneOtpSignUp,
      completePhoneSignUp,
      completePhonePasswordReset,
      adminSignIn,
      staffSignUp,
      updateProfile,
      signOut,
      refreshUser,
    }),
    [
      user,
      bootstrapping,
      refreshing,
      isAdmin,
      isInstructor,
      isStaff,
      isLearner,
      phoneOtpEnabled,
      setAuthFlow,
      signUp,
      signIn,
      sendPhoneOtp,
      verifyPhoneOtpSignUp,
      completePhoneSignUp,
      completePhonePasswordReset,
      adminSignIn,
      staffSignUp,
      updateProfile,
      signOut,
      refreshUser,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
