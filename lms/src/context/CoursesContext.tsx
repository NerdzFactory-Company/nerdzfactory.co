import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Course } from '@/types'
import { apiFetchCourses } from '@/lib/supabase/lmsApi'
import { courses as seedCourses } from '@/data/courses'
import { isSupabaseDataEnabled } from '@/lib/dataMode'
import { useAuth } from '@/context/AuthContext'

interface CoursesContextValue {
  courses: Course[]
  loading: boolean
  error: string | null
  refreshCourses: (includeUnpublished?: boolean) => Promise<void>
  getCourse: (id: string) => Course | undefined
}

const CoursesContext = createContext<CoursesContextValue | null>(null)

export function CoursesProvider({ children }: { children: ReactNode }) {
  const { isStaff } = useAuth()
  const [courses, setCourses] = useState<Course[]>(isSupabaseDataEnabled() ? [] : seedCourses)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshCourses = useCallback(
    async (includeUnpublished?: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const unpublished = includeUnpublished ?? isStaff
        const data = await apiFetchCourses(unpublished)
        setCourses(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load courses.')
        // Keep the last good catalog instead of wiping the page on a transient error.
      } finally {
        setLoading(false)
      }
    },
    [isStaff],
  )

  useEffect(() => {
    refreshCourses()
  }, [refreshCourses])

  const getCourse = useCallback(
    (id: string) => courses.find((c) => c.id === id),
    [courses],
  )

  const value = useMemo(
    () => ({ courses, loading, error, refreshCourses, getCourse }),
    [courses, loading, error, refreshCourses, getCourse],
  )

  return <CoursesContext.Provider value={value}>{children}</CoursesContext.Provider>
}

export function useCourses() {
  const ctx = useContext(CoursesContext)
  if (!ctx) throw new Error('useCourses must be used within CoursesProvider')
  return ctx
}
