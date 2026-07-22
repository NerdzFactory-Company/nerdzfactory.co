import type { User, CourseProgress } from '@/types'

const USERS_KEY = 'nf-lms-users'
const SESSION_KEY = 'nf-lms-session'
const SESSION_TYPE_KEY = 'nf-lms-session-type'
const PROGRESS_KEY = 'nf-lms-progress'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getUsers(): User[] {
  return read<User[]>(USERS_KEY, [])
}

export function saveUser(user: User) {
  const users = getUsers()
  const idx = users.findIndex((u) => u.phone === user.phone)
  if (idx >= 0) users[idx] = user
  else users.push(user)
  write(USERS_KEY, users)
}

export function findUserByPhone(phone: string): User | undefined {
  return getUsers().find((u) => u.phone === phone)
}

export function getSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY)
}

export function getSessionType(): 'learner' | null {
  const t = localStorage.getItem(SESSION_TYPE_KEY)
  return t === 'learner' ? 'learner' : null
}

export function setLearnerSession(userId: string) {
  localStorage.setItem(SESSION_KEY, userId)
  localStorage.setItem(SESSION_TYPE_KEY, 'learner')
}

export function clearLearnerSession() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(SESSION_TYPE_KEY)
}

export function getAllProgress(): CourseProgress[] {
  return read<CourseProgress[]>(PROGRESS_KEY, [])
}

export function getUserProgress(userId: string): CourseProgress[] {
  return getAllProgress().filter((p) => p.userId === userId)
}

export function getCourseProgress(userId: string, courseId: string): CourseProgress | undefined {
  return getAllProgress().find((p) => p.userId === userId && p.courseId === courseId)
}

export function saveCourseProgress(progress: CourseProgress) {
  const all = getAllProgress()
  const idx = all.findIndex((p) => p.userId === progress.userId && p.courseId === progress.courseId)
  if (idx >= 0) all[idx] = progress
  else all.push(progress)
  write(PROGRESS_KEY, all)
}
