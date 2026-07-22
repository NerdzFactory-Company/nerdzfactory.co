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
import type { Course, CourseProgress } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { useCourses } from '@/context/CoursesContext'
import { apiFetchProgress, apiSaveProgress } from '@/lib/supabase/lmsApi'
import { isSupabaseDataEnabled } from '@/lib/dataMode'
import { getUserProgress, saveCourseProgress } from '@/lib/storage'
import { sortedLessons, publishedCourses } from '@/lib/courses'

interface ProgressContextValue {
  progress: CourseProgress[]
  loading: boolean
  saveError: string | null
  getProgressForCourse: (courseId: string) => CourseProgress | undefined
  getCoursePercent: (course: Course) => number
  getOverallPercent: () => number
  markLessonComplete: (courseId: string, lessonId: string) => Promise<void>
  setLastLesson: (courseId: string, lessonId: string) => Promise<void>
  isLessonComplete: (courseId: string, lessonId: string) => boolean
  refreshProgress: () => Promise<void>
  clearSaveError: () => void
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { courses } = useCourses()
  const [progress, setProgress] = useState<CourseProgress[]>([])
  const progressRef = useRef(progress)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    progressRef.current = progress
  }, [progress])
  const [saveError, setSaveError] = useState<string | null>(null)

  const refreshProgress = useCallback(async () => {
    if (!user) {
      setProgress([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      if (isSupabaseDataEnabled()) {
        const remote = await apiFetchProgress(user.id)
        setProgress(remote)
      } else {
        setProgress(getUserProgress(user.id))
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not load your progress.')
      // Keep any previously loaded progress rather than wiping the UI.
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refreshProgress()
  }, [refreshProgress])

  const clearSaveError = useCallback(() => setSaveError(null), [])

  const getProgressForCourse = useCallback(
    (courseId: string) => progress.find((p) => p.courseId === courseId),
    [progress],
  )

  const getCoursePercent = useCallback(
    (course: Course) => {
      const p = progress.find((pr) => pr.courseId === course.id)
      const total = course.lessons.length
      if (!total) return 0
      return Math.round(((p?.completedLessonIds.length ?? 0) / total) * 100)
    },
    [progress],
  )

  const getOverallPercent = useCallback(() => {
    const visible = publishedCourses(courses)
    const totalLessons = visible.reduce((sum, c) => sum + c.lessons.length, 0)
    if (!totalLessons) return 0
    const publishedIds = new Set(visible.map((c) => c.id))
    const completed = progress
      .filter((p) => publishedIds.has(p.courseId))
      .reduce((sum, p) => sum + p.completedLessonIds.length, 0)
    return Math.round((completed / totalLessons) * 100)
  }, [progress, courses])

  const persist = useCallback(async (next: CourseProgress) => {
    if (isSupabaseDataEnabled()) {
      const result = await apiSaveProgress(next)
      if (!result.ok) {
        setSaveError(result.error)
        throw new Error(result.error)
      }
    } else {
      saveCourseProgress(next)
    }
    setProgress((prev) => {
      const idx = prev.findIndex((p) => p.courseId === next.courseId)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = next
        return copy
      }
      return [...prev, next]
    })
    setSaveError(null)
  }, [])

  const upsert = useCallback(
    async (courseId: string, updater: (prev: CourseProgress) => CourseProgress) => {
      if (!user) return
      const existing = progressRef.current.find((p) => p.courseId === courseId)
      const base: CourseProgress = existing ?? {
        userId: user.id,
        courseId,
        completedLessonIds: [],
        updatedAt: new Date().toISOString(),
      }
      await persist(updater(base))
    },
    [user, persist],
  )

  const markLessonComplete = useCallback(
    async (courseId: string, lessonId: string) => {
      await upsert(courseId, (prev) => {
        const ids = new Set(prev.completedLessonIds)
        ids.add(lessonId)
        return {
          ...prev,
          completedLessonIds: Array.from(ids),
          lastLessonId: lessonId,
          updatedAt: new Date().toISOString(),
        }
      })
    },
    [upsert],
  )

  const setLastLesson = useCallback(
    async (courseId: string, lessonId: string) => {
      await upsert(courseId, (prev) => ({
        ...prev,
        lastLessonId: lessonId,
        updatedAt: new Date().toISOString(),
      }))
    },
    [upsert],
  )

  const isLessonComplete = useCallback(
    (courseId: string, lessonId: string) => {
      const p = progress.find((pr) => pr.courseId === courseId)
      return p?.completedLessonIds.includes(lessonId) ?? false
    },
    [progress],
  )

  const value = useMemo(
    () => ({
      progress,
      loading,
      saveError,
      getProgressForCourse,
      getCoursePercent,
      getOverallPercent,
      markLessonComplete,
      setLastLesson,
      isLessonComplete,
      refreshProgress,
      clearSaveError,
    }),
    [
      progress,
      loading,
      saveError,
      getProgressForCourse,
      getCoursePercent,
      getOverallPercent,
      markLessonComplete,
      setLastLesson,
      isLessonComplete,
      refreshProgress,
      clearSaveError,
    ],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}

export function getResumeLessonId(course: Course, courseProgress?: CourseProgress): string {
  const lessons = sortedLessons(course)
  if (!lessons.length) return ''
  if (courseProgress?.lastLessonId) {
    const lastIncomplete = lessons.find((l) => !courseProgress.completedLessonIds.includes(l.id))
    if (lastIncomplete) return lastIncomplete.id
    return courseProgress.lastLessonId
  }
  return lessons[0].id
}
