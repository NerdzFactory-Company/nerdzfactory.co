import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { seedUsers } from '@/data/mockData'
import type { Role, User } from '@/types'

/** Never persist passwords — mock login compares against seed data only. */
function stripPasswordForSession(u: User): User {
  const { password: _drop, ...safe } = u
  void _drop
  return safe as User
}

interface AuthContextValue {
  user: User | null
  role: Role | null
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  updateProfile: (patch: Partial<User>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'nf-auth-user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [storedUser, setStoredUser] = useLocalStorage<User | null>(STORAGE_KEY, null)

  /** Drop legacy sessions that stored password in localStorage. */
  useEffect(() => {
    if (storedUser && storedUser.password !== undefined) {
      setStoredUser(stripPasswordForSession(storedUser))
    }
  }, [storedUser, setStoredUser])

  const user = useMemo(
    () => (storedUser ? stripPasswordForSession(storedUser) : null),
    [storedUser],
  )

  const setSessionUser = useCallback(
    (next: User | null) => {
      setStoredUser(next ? stripPasswordForSession(next) : null)
    },
    [setStoredUser],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      const match = seedUsers.find(
        (u) =>
          u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
      )
      if (!match) {
        return { ok: false as const, error: 'Invalid email or password' }
      }
      if (!match.active) {
        return { ok: false as const, error: 'This account is inactive. Contact HR.' }
      }
      setSessionUser(match)
      return { ok: true as const }
    },
    [setSessionUser],
  )

  const logout = useCallback(() => setStoredUser(null), [setStoredUser])

  const updateProfile = useCallback(
    (patch: Partial<User>) => {
      setStoredUser((prev) => {
        if (!prev) return prev
        const merged = { ...prev, ...patch }
        return stripPasswordForSession(merged as User)
      })
    },
    [setStoredUser],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      login,
      logout,
      updateProfile,
    }),
    [user, login, logout, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
