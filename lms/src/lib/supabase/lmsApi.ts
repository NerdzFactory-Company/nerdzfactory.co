import { supabase } from '@/lib/supabase'
import { isSupabaseDataEnabled } from '@/lib/dataMode'
import { normalizePhone } from '@/lib/phone'
import type {
  Assignment,
  AssignmentSubmission,
  Course,
  CourseProgress,
  EmailTemplate,
  Lesson,
  LessonResource,
  ProfileUpdate,
  PendingStaffRequest,
  User,
  UserRole,
} from '@/types'
import { generatedAssignments } from '@/content/assignments.generated'
import {
  getMockSubmissionsForAssignment,
  shouldUseMockSubmissions,
} from '@/data/mockAssignmentSubmissions'
import { formatFullName, parseLegacyName } from '@/utils/userDisplay'
import { courses as seedCourses } from '@/data/courses'
import { MAX_IMAGE_BYTES, MAX_IMAGE_MB } from '@/lib/uploadLimits'

type DbLearner = {
  id: string
  phone: string
  name: string
  first_name?: string
  last_name?: string
  bio?: string
  location?: string
  job_title?: string
  role: UserRole
  created_at: string
  updated_at?: string
}

type DbAdmin = {
  id: string
  email: string
  name: string
  first_name?: string
  last_name?: string
  bio?: string
  location?: string
  job_title?: string
  role?: string
  status?: string
  created_at: string
  updated_at?: string
}

type DbCourse = {
  id: string
  title: string
  description: string
  short_description?: string
  homepage_content?: string
  thumbnail: string
  hero_image?: string
  category: string
  level: Course['level']
  duration_estimate?: string
  time_to_complete?: string
  prerequisites?: string
  target_audience?: string
  learning_outcomes?: string[]
  instructor_name?: string
  instructor_bio?: string
  certificate_offered?: boolean
  sort_order: number
  published: boolean
}

type DbLesson = {
  id: string
  course_id: string
  title: string
  description: string
  video_url: string
  duration: string
  sort_order: number
  thumbnail_url?: string
  prerequisites?: string
  objectives?: unknown
  key_takeaways?: unknown
  resources?: unknown
}

type DbProgress = {
  id: string
  learner_id: string
  course_id: string
  completed_lesson_ids: string[]
  last_lesson_id: string | null
  updated_at: string
}

type DbEmailTemplate = {
  id: string
  name: string
  description: string
  category: EmailTemplate['category']
  subject: string
  body_html: string
  body_text: string
  variables: string[]
  sync_to_supabase_auth: boolean
  supabase_template_key?: string | null
  supabase_subject?: string | null
  supabase_body_html?: string | null
  updated_at: string
}

function mapLearner(row: DbLearner): User {
  const legacy = parseLegacyName(row.name ?? '')
  const firstName = row.first_name?.trim() || legacy.firstName
  const lastName = row.last_name?.trim() || legacy.lastName
  return {
    id: row.id,
    phone: row.phone,
    name: formatFullName(firstName, lastName) || row.name,
    firstName,
    lastName,
    bio: row.bio ?? '',
    location: row.location ?? '',
    jobTitle: row.job_title ?? '',
    role: 'learner',
    authType: 'phone',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapAdmin(row: DbAdmin): User {
  const legacy = parseLegacyName(row.name || row.email)
  const firstName = row.first_name?.trim() || legacy.firstName
  const lastName = row.last_name?.trim() || legacy.lastName
  return {
    id: row.id,
    email: row.email,
    name: formatFullName(firstName, lastName) || row.name || row.email,
    firstName,
    lastName,
    bio: row.bio ?? '',
    location: row.location ?? '',
    jobTitle: row.job_title ?? '',
    role: row.role === 'instructor' ? 'instructor' : 'admin',
    authType: 'email',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function parseStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function parseLessonResources(value: unknown): LessonResource[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is { label: string; url: string } => {
      if (!item || typeof item !== 'object') return false
      const row = item as Record<string, unknown>
      return typeof row.label === 'string' && typeof row.url === 'string'
    })
    .map((item) => ({ label: item.label.trim(), url: item.url.trim() }))
    .filter((item) => item.label && item.url)
}

function mapLesson(row: DbLesson): Lesson {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    videoUrl: row.video_url,
    duration: row.duration,
    order: row.sort_order,
    thumbnailUrl: row.thumbnail_url ?? '',
    prerequisites: row.prerequisites ?? '',
    objectives: parseStringList(row.objectives),
    keyTakeaways: parseStringList(row.key_takeaways),
    resources: parseLessonResources(row.resources),
  }
}

function mapCourse(row: DbCourse, lessons: Lesson[]): Course {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    shortDescription: row.short_description ?? '',
    homepageContent: row.homepage_content ?? '',
    thumbnail: row.thumbnail,
    heroImage: row.hero_image || row.thumbnail,
    category: row.category,
    level: row.level,
    durationEstimate: row.duration_estimate ?? '',
    timeToComplete: row.time_to_complete ?? '',
    prerequisites: row.prerequisites ?? '',
    targetAudience: row.target_audience ?? '',
    learningOutcomes: row.learning_outcomes ?? [],
    instructorName: row.instructor_name ?? '',
    instructorBio: row.instructor_bio ?? '',
    certificateOffered: false,
    published: row.published,
    sortOrder: row.sort_order,
    lessons,
  }
}

function mapProgress(row: DbProgress): CourseProgress {
  return {
    userId: row.learner_id,
    courseId: row.course_id,
    completedLessonIds: row.completed_lesson_ids ?? [],
    lastLessonId: row.last_lesson_id ?? undefined,
    updatedAt: row.updated_at,
  }
}

function mapEmailTemplate(row: DbEmailTemplate): EmailTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    subject: row.subject,
    bodyHtml: row.body_html,
    bodyText: row.body_text,
    variables: row.variables ?? [],
    syncToSupabaseAuth: row.sync_to_supabase_auth,
    supabaseTemplateKey: row.supabase_template_key ?? undefined,
    supabaseSubject: row.supabase_subject ?? row.subject,
    supabaseBodyHtml: row.supabase_body_html ?? row.body_html,
    updatedAt: row.updated_at,
  }
}

function rpcErrorMessage(err: { message: string }): string {
  const msg = err.message ?? ''
  if (msg.includes('PHONE_EXISTS')) return 'This number is already registered. Tap "Sign in" instead.'
  if (msg.includes('SUBMISSION_LOCKED')) {
    return 'This worksheet is locked by your instructor. You can no longer change your answers.'
  }
  if (msg.includes('ASSIGNMENT_LOCKED')) {
    return 'This worksheet is locked by your instructor. New answers cannot be submitted right now.'
  }
  if (msg.includes('LEARNER_NOT_LINKED')) {
    return 'Your account is not fully set up. Sign out, sign in again, then try submitting.'
  }
  if (msg.includes('ASSIGNMENT_UNAVAILABLE')) {
    return 'This worksheet is not available for submission right now.'
  }
  if (msg.includes('FORBIDDEN')) return 'You do not have permission to do that.'
  if (msg.includes('NOT_AUTHENTICATED')) return 'Please sign in again.'
  if (msg.includes('NOT_FOUND')) return 'We could not find this number. Please sign up first.'
  if (msg.includes('INVALID_PHONE')) return 'Please enter a valid Nigerian phone number.'
  if (msg.includes('INVALID_NAME')) return 'Please enter your name.'
  if (msg.includes('INVALID_FIRST_NAME')) return 'Please enter your first name (at least 2 characters).'
  if (msg.includes('INVALID_LAST_NAME')) return 'Please enter your last name.'
  if (msg.includes('ALREADY_REGISTERED')) return 'This account is already registered. Try signing in instead.'
  if (msg.includes('INVALID_ROLE')) return 'Invalid staff role.'
  if (msg.includes('NAME_REQUIRED')) return 'Please enter your name to create an account.'
  if (msg.includes('Invalid login credentials')) return 'Incorrect email or password.'
  if (msg.includes('otp_expired') || msg.includes('Token has expired')) {
    return 'That code has expired. Codes are valid for 10 minutes. Tap Send code to get a new one.'
  }
  if (msg.includes('INVALID_PURPOSE')) return 'Something went wrong preparing your code. Please try again.'
  if (msg.includes('hook signature') || msg.includes('Termii') || msg.includes('SEND_SMS')) {
    return 'We could not send a text message right now. Please try again later.'
  }
  return msg || 'Something went wrong. Please try again.'
}

function formatAuthError(error: { message?: string; status?: number; code?: string }): string {
  const msg = (error.message ?? '').trim()
  if (msg && msg !== '{}' && msg !== '[object Object]') {
    return rpcErrorMessage({ message: msg })
  }
  if (error.code) {
    return rpcErrorMessage({ message: error.code })
  }
  const status = error.status
  if (status === 401 || status === 403) {
    return 'We could not send a text message right now. Please try again in a few minutes.'
  }
  if (status === 500 || status === 502 || status === 503) {
    return 'We could not send a text message right now. Please try again later.'
  }
  if (status === 422) return 'Please enter a valid phone number for text messages.'
  return 'We could not send a verification code. Please try again.'
}

// ---- Learner auth (phone) ----

/** Learner row for the current authenticated session (links legacy rows by verified JWT phone). */
async function apiGetMyLearner(): Promise<User | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('lms_get_my_learner')
  if (error || !data || !(data as DbLearner).id) return null
  return mapLearner(data as DbLearner)
}

export async function apiEnsureLearner(phone: string, firstName?: string, lastName?: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.rpc('lms_ensure_learner', {
    p_phone: phone,
    p_first_name: firstName ?? null,
    p_last_name: lastName ?? null,
  })
  if (error) throw new Error(rpcErrorMessage(error))
  return mapLearner(data as DbLearner)
}

export async function apiUpdateLearnerProfile(learnerId: string, profile: ProfileUpdate) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.rpc('lms_update_learner_profile', {
    p_learner_id: learnerId,
    p_first_name: profile.firstName.trim(),
    p_last_name: profile.lastName.trim(),
    p_bio: profile.bio?.trim() ?? '',
    p_location: profile.location?.trim() ?? '',
    p_job_title: profile.jobTitle?.trim() ?? '',
  })
  if (error) throw new Error(rpcErrorMessage(error))
  return mapLearner(data as DbLearner)
}

export async function apiUpdateAdminProfile(profile: ProfileUpdate) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.rpc('lms_admin_update_profile', {
    p_first_name: profile.firstName.trim(),
    p_last_name: profile.lastName.trim(),
    p_bio: profile.bio?.trim() ?? '',
    p_location: profile.location?.trim() ?? '',
    p_job_title: profile.jobTitle?.trim() ?? '',
  })
  if (error) throw new Error(rpcErrorMessage(error))
  return mapAdmin(data as DbAdmin)
}

export type PhoneOtpPurpose = 'signup' | 'recovery'

async function apiSetOtpPurpose(phone: string, purpose: PhoneOtpPurpose) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.rpc('lms_set_otp_purpose', {
    p_phone: phone,
    p_purpose: purpose,
  })
  if (error) throw new Error(rpcErrorMessage(error))
}

export async function apiSendPhoneOtp(
  phone: string,
  options?: { createUser?: boolean; purpose?: PhoneOtpPurpose },
) {
  if (!supabase) throw new Error('Supabase not configured')
  const purpose: PhoneOtpPurpose =
    options?.purpose ?? (options?.createUser === false ? 'recovery' : 'signup')

  // Record purpose before Auth sends SMS — the hook runs before user_metadata is updated.
  await apiSetOtpPurpose(phone, purpose)

  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser: options?.createUser ?? true,
      data: { otp_purpose: purpose },
    },
  })
  if (error) return { ok: false as const, error: formatAuthError(error) }
  return { ok: true as const }
}

export async function apiIsPhoneRegistered(phone: string): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase.rpc('lms_phone_registered', { p_phone: phone })
  if (error) return false
  return data === true
}

export async function apiVerifyPhoneOtp(phone: string, token: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
  if (error) return { ok: false as const, error: rpcErrorMessage(error) }
  return { ok: true as const }
}

/** Confirms the user already verified SMS OTP and has an active auth session (recovery/signup password step). */
export async function apiAssertPhoneAuthSession(expectedPhone: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data } = await supabase.auth.getSession()
  if (!data.session?.user) {
    return {
      ok: false as const,
      error: 'Your verification expired. Go back and tap Send code to get a new one.',
    }
  }
  const normalized = normalizePhone(expectedPhone)
  if (!normalized) {
    return { ok: false as const, error: 'Please enter a valid Nigerian phone number.' }
  }
  const sessionPhone = data.session.user.phone
  if (sessionPhone) {
    const sessionNormalized = normalizePhone(sessionPhone)
    if (sessionNormalized && sessionNormalized !== normalized) {
      return {
        ok: false as const,
        error: 'Phone number does not match your verified session. Please start over.',
      }
    }
  }
  return { ok: true as const }
}

export async function apiUpdateAuthUserPassword(password: string) {
  if (!supabase) throw new Error('Supabase not configured')
  if (password.length < 8) {
    return { ok: false as const, error: 'Password must be at least 8 characters.' }
  }
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { ok: false as const, error: rpcErrorMessage(error) }
  return { ok: true as const }
}

/** @deprecated Use apiUpdateAuthUserPassword */
export const apiSetLearnerPassword = apiUpdateAuthUserPassword

export async function apiLearnerSignInWithPassword(phone: string, password: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.auth.signInWithPassword({ phone, password })
  if (error) {
    const msg = error.message ?? ''
    if (msg.includes('Invalid login credentials')) {
      return { ok: false as const, error: 'Incorrect phone number or password.' }
    }
    return { ok: false as const, error: rpcErrorMessage(error) }
  }

  const learner = await apiGetMyLearner()
  if (!learner) {
    await supabase.auth.signOut()
    return { ok: false as const, error: 'We could not find this account. Please sign up first.' }
  }
  return { ok: true as const, user: learner }
}

export async function apiGetPhoneLearnerSession(): Promise<User | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  const authUser = data.session?.user
  if (!authUser) return null
  if (await apiGetAdminProfile(authUser.id)) return null

  return apiGetMyLearner()
}

export async function apiAdminRequestPasswordReset(email: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const redirectTo = `${window.location.origin}/admin/reset-password`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) return { ok: false as const, error: rpcErrorMessage(error) }
  return { ok: true as const }
}

// ---- Admin auth (email + password via Supabase Auth) ----

export async function apiAdminSignIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { ok: false as const, error: rpcErrorMessage(error) }

  const pending = await apiGetPendingStaffProfile(data.user.id)
  if (pending) {
    await supabase.auth.signOut()
    return {
      ok: false as const,
      error:
        'Your admin account is waiting for approval. An existing admin must approve you before you can sign in.',
    }
  }

  const admin = await apiGetAdminProfile(data.user.id)
  if (!admin) {
    await supabase.auth.signOut()
    return { ok: false as const, error: 'This account is not registered as staff. Sign up from the staff login page.' }
  }
  return { ok: true as const, user: admin }
}

async function apiGetPendingStaffProfile(authUserId: string): Promise<DbAdmin | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('lms_admins')
    .select('*')
    .eq('id', authUserId)
    .eq('status', 'pending')
    .maybeSingle()
  if (error || !data) return null
  return data as DbAdmin
}

export async function apiStaffSignUp(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: 'instructor' | 'admin',
): Promise<
  | { ok: true; pendingApproval: boolean; user?: User }
  | { ok: false; error: string; needsEmailConfirmation?: boolean }
> {
  if (!supabase) throw new Error('Supabase not configured')
  if (!email.trim()) return { ok: false as const, error: 'Please enter your email address.' }
  if (!password) return { ok: false as const, error: 'Please choose a password.' }
  if (!firstName.trim()) return { ok: false as const, error: 'Please enter your first name.' }
  if (!lastName.trim()) return { ok: false as const, error: 'Please enter your last name.' }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        name: formatFullName(firstName, lastName),
      },
    },
  })
  if (error) return { ok: false as const, error: rpcErrorMessage(error) }
  if (!data.user) return { ok: false as const, error: 'Sign up failed. Please try again.' }

  if (!data.session) {
    return {
      ok: false as const,
      error: 'Check your email to confirm your address, then sign in.',
      needsEmailConfirmation: true,
    }
  }

  const { error: registerError } = await supabase.rpc('lms_register_staff', {
    p_first_name: firstName.trim(),
    p_last_name: lastName.trim(),
    p_role: role,
  })
  if (registerError) {
    await supabase.auth.signOut()
    const msg = rpcErrorMessage(registerError)
    if (msg.includes('ALREADY_REGISTERED')) {
      return { ok: false as const, error: 'This account is already registered. Try signing in instead.' }
    }
    return { ok: false as const, error: msg }
  }

  await supabase.auth.signOut()
  return { ok: true as const, pendingApproval: true }
}

export async function apiListPendingStaff(): Promise<PendingStaffRequest[]> {
  if (!isSupabaseDataEnabled()) return []
  const { data, error } = await supabase!.rpc('lms_admin_list_pending_staff')
  if (error) throw new Error(rpcErrorMessage(error))
  return ((data as Array<{
    id: string
    email: string
    name: string
    first_name: string
    last_name: string
    role?: string
    created_at: string
  }> | null) ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    role: row.role === 'instructor' ? 'instructor' : 'admin',
    requestedAt: row.created_at,
  }))
}

export async function apiApprovePendingStaff(staffId: string): Promise<void> {
  if (!isSupabaseDataEnabled()) return
  const { error } = await supabase!.rpc('lms_admin_approve_staff', { p_staff_id: staffId })
  if (error) throw new Error(rpcErrorMessage(error))
}

export async function apiRejectPendingStaff(staffId: string): Promise<void> {
  if (!isSupabaseDataEnabled()) return
  const { error } = await supabase!.rpc('lms_admin_reject_staff', { p_staff_id: staffId })
  if (error) throw new Error(rpcErrorMessage(error))
}

export async function apiGetAdminProfile(authUserId: string): Promise<User | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('lms_admins')
    .select('*')
    .eq('id', authUserId)
    .eq('status', 'active')
    .maybeSingle()
  if (error || !data) return null
  return mapAdmin(data as DbAdmin)
}

export async function apiGetAdminSession(): Promise<User | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  if (!data.session?.user) return null
  return apiGetAdminProfile(data.session.user.id)
}

export async function apiAdminSignOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

// ---- Courses & progress ----

export async function apiFetchCourses(includeUnpublished = false): Promise<Course[]> {
  if (!isSupabaseDataEnabled()) return seedCourses

  let query = supabase!.from('lms_courses').select('*').order('sort_order', { ascending: true })
  if (!includeUnpublished) query = query.eq('published', true)

  const { data: courseRows, error } = await query
  if (error) throw new Error(rpcErrorMessage(error))
  if (!courseRows?.length) return []

  const { data: lessonRows, error: lessonError } = await supabase!
    .from('lms_lessons')
    .select('*')
    .order('sort_order', { ascending: true })
  if (lessonError) throw new Error(rpcErrorMessage(lessonError))

  const lessonsByCourse = new Map<string, Lesson[]>()
  for (const row of (lessonRows ?? []) as DbLesson[]) {
    const list = lessonsByCourse.get(row.course_id) ?? []
    list.push(mapLesson(row))
    lessonsByCourse.set(row.course_id, list)
  }

  return (courseRows as DbCourse[]).map((c) => mapCourse(c, lessonsByCourse.get(c.id) ?? []))
}

export async function apiFetchProgress(learnerId: string): Promise<CourseProgress[]> {
  if (!isSupabaseDataEnabled()) return []
  const { data, error } = await supabase!.from('lms_progress').select('*').eq('learner_id', learnerId)
  if (error) throw new Error(rpcErrorMessage(error))
  return (data as DbProgress[] | null)?.map(mapProgress) ?? []
}

export async function apiSaveProgress(
  progress: CourseProgress,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseDataEnabled()) return { ok: true as const }
  const { error } = await supabase!.rpc('lms_save_progress', {
    p_learner_id: progress.userId,
    p_course_id: progress.courseId,
    p_completed_lesson_ids: progress.completedLessonIds,
    p_last_lesson_id: progress.lastLessonId ?? null,
  })
  if (error) return { ok: false as const, error: rpcErrorMessage(error) }
  return { ok: true as const }
}

export async function apiFetchLearners(): Promise<User[]> {
  if (!isSupabaseDataEnabled()) return []
  const { data, error } = await supabase!
    .from('lms_learners')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(rpcErrorMessage(error))
  return (data as DbLearner[]).map(mapLearner)
}

export async function apiFetchAllProgress(): Promise<CourseProgress[]> {
  if (!isSupabaseDataEnabled()) return []
  const { data, error } = await supabase!.from('lms_progress').select('*')
  if (error) throw new Error(rpcErrorMessage(error))
  return (data as DbProgress[] | null)?.map(mapProgress) ?? []
}

// ---- Admin mutations (require authenticated Supabase session) ----

export async function apiAdminUpsertCourse(course: Course & { sortOrder?: number; published?: boolean }) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.rpc('lms_admin_upsert_course', {
    p_id: course.id,
    p_title: course.title,
    p_description: course.description,
    p_short_description: course.shortDescription ?? '',
    p_homepage_content: course.homepageContent ?? '',
    p_thumbnail: course.thumbnail,
    p_hero_image: course.heroImage ?? '',
    p_category: course.category,
    p_level: course.level,
    p_duration_estimate: course.durationEstimate ?? '',
    p_time_to_complete: course.timeToComplete ?? '',
    p_prerequisites: course.prerequisites ?? '',
    p_target_audience: course.targetAudience ?? '',
    p_learning_outcomes: course.learningOutcomes ?? [],
    p_instructor_name: course.instructorName ?? '',
    p_instructor_bio: course.instructorBio ?? '',
    p_certificate_offered: false,
    p_sort_order: course.sortOrder ?? 0,
    p_published: course.published ?? true,
  })
  if (error) throw new Error(rpcErrorMessage(error))
}

export async function apiAdminSetCoursePublished(courseId: string, published: boolean) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.rpc('lms_admin_set_course_published', {
    p_id: courseId,
    p_published: published,
  })
  if (error) throw new Error(rpcErrorMessage(error))
}

export async function apiAdminDeleteCourse(courseId: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.rpc('lms_admin_delete_course', { p_id: courseId })
  if (error) throw new Error(rpcErrorMessage(error))
}

export async function apiAdminUpsertLesson(courseId: string, lesson: Lesson) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.rpc('lms_admin_upsert_lesson', {
    p_id: lesson.id,
    p_course_id: courseId,
    p_title: lesson.title,
    p_description: lesson.description,
    p_video_url: lesson.videoUrl,
    p_duration: lesson.duration,
    p_sort_order: lesson.order,
    p_prerequisites: lesson.prerequisites ?? '',
    p_objectives: lesson.objectives ?? [],
    p_key_takeaways: lesson.keyTakeaways ?? [],
    p_resources: lesson.resources ?? [],
    p_thumbnail_url: lesson.thumbnailUrl ?? '',
  })
  if (error) throw new Error(rpcErrorMessage(error))
}

export async function apiAdminReorderCourses(
  orders: { id: string; sortOrder: number }[],
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.rpc('lms_admin_reorder_courses', {
    p_orders: orders.map((o) => ({ id: o.id, sort_order: o.sortOrder })),
  })
  if (error) throw new Error(rpcErrorMessage(error))
}

export async function apiAdminDeleteLesson(lessonId: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.rpc('lms_admin_delete_lesson', { p_id: lessonId })
  if (error) throw new Error(rpcErrorMessage(error))
}

const LMS_MEDIA_BUCKET = 'lms-media'

async function uploadToMediaBucket(file: File, path: string, kind: 'image' | 'video'): Promise<string> {
  if (!supabase) throw new Error('Uploads are not available yet. Please ask your administrator to finish setup.')
  if (kind === 'image' && file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Image must be ${MAX_IMAGE_MB} MB or smaller.`)
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || (kind === 'video' ? 'mp4' : 'jpg')
  const safePath = path.replace(/[^a-zA-Z0-9/_-]/g, '-')
  const filePath = `${safePath}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(LMS_MEDIA_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (error) {
    const msg = error.message || ''
    if (/mime type|not supported/i.test(msg)) {
      throw new Error(
        kind === 'video'
          ? 'This video format is not allowed yet. Ask your administrator to run the latest database update, or upload an MP4.'
          : msg,
      )
    }
    if (/exceeded|too large|maximum/i.test(msg)) {
      throw new Error(
        kind === 'image'
          ? `Image must be ${MAX_IMAGE_MB} MB or smaller.`
          : 'This file is larger than the upload limit allows. Try a smaller file.',
      )
    }
    throw new Error(msg || `Could not upload ${kind}.`)
  }
  const { data } = supabase.storage.from(LMS_MEDIA_BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}

export async function apiUploadCourseImage(file: File, path: string): Promise<string> {
  return uploadToMediaBucket(file, path, 'image')
}

export async function apiUploadLessonVideo(file: File, path: string): Promise<string> {
  return uploadToMediaBucket(file, path, 'video')
}

// ---- Site-wide images (admin Media tab) ----

const SITE_IMAGES_LOCAL_KEY = 'nf-lms-site-images'

function readLocalSiteImages(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SITE_IMAGES_LOCAL_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

/** Returns only the overridden keys — the app falls back to built-in defaults. */
export async function apiFetchSiteImages(): Promise<Record<string, string>> {
  if (!isSupabaseDataEnabled()) return readLocalSiteImages()
  const { data, error } = await supabase!.from('lms_site_images').select('key,url')
  if (error) throw new Error(error.message)
  const map: Record<string, string> = {}
  for (const row of (data ?? []) as { key: string; url: string }[]) {
    if (row.url) map[row.key] = row.url
  }
  return map
}

/** Empty url removes the override (reverts to the built-in default). */
export async function apiSaveSiteImages(entries: Record<string, string>): Promise<void> {
  if (!isSupabaseDataEnabled()) {
    const merged = { ...readLocalSiteImages() }
    for (const [key, url] of Object.entries(entries)) {
      if (url.trim()) merged[key] = url.trim()
      else delete merged[key]
    }
    localStorage.setItem(SITE_IMAGES_LOCAL_KEY, JSON.stringify(merged))
    return
  }

  const toUpsert = Object.entries(entries)
    .filter(([, url]) => url.trim())
    .map(([key, url]) => ({ key, url: url.trim(), updated_at: new Date().toISOString() }))
  const toDelete = Object.entries(entries)
    .filter(([, url]) => !url.trim())
    .map(([key]) => key)

  if (toUpsert.length) {
    const { error } = await supabase!.from('lms_site_images').upsert(toUpsert)
    if (error) throw new Error(error.message)
  }
  if (toDelete.length) {
    const { error } = await supabase!.from('lms_site_images').delete().in('key', toDelete)
    if (error) throw new Error(error.message)
  }
}

// ---- Email templates (repo docs only — no admin UI) ----

export async function apiFetchEmailTemplates(): Promise<EmailTemplate[]> {
  if (!isSupabaseDataEnabled()) return []
  const { data, error } = await supabase!
    .from('lms_email_templates')
    .select('*')
    .order('category')
    .order('name')
  if (error) throw new Error(rpcErrorMessage(error))
  return (data as DbEmailTemplate[]).map(mapEmailTemplate)
}

export async function apiUpdateEmailTemplate(
  template: Pick<
    EmailTemplate,
    'id' | 'subject' | 'bodyHtml' | 'bodyText' | 'supabaseSubject' | 'supabaseBodyHtml'
  >,
) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.rpc('lms_admin_update_email_template', {
    p_id: template.id,
    p_subject: template.subject,
    p_body_html: template.bodyHtml,
    p_body_text: template.bodyText,
    p_supabase_subject: template.supabaseSubject,
    p_supabase_body_html: template.supabaseBodyHtml,
  })
  if (error) throw new Error(rpcErrorMessage(error))
}

/** Replace {{var}} placeholders for preview */
export function renderEmailTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`)
}

const SUPABASE_PREVIEW_SAMPLES: Record<string, string> = {
  ConfirmationURL: 'https://ifkviqlzhdsaovozlbqd.supabase.co/auth/v1/verify?token=example',
  SiteURL: 'https://learn.nerdzfactory.co',
  Email: 'admin@nerdzfactory.co',
  NewEmail: 'newemail@nerdzfactory.co',
  Token: '123456',
  TokenHash: 'example-token-hash',
  RedirectTo: 'https://learn.nerdzfactory.co/admin',
}

/** Replace {{ .Var }} placeholders for Supabase template preview */
export function renderSupabaseEmailPreview(template: string): string {
  return template.replace(/\{\{\s*\.(\w+)\s*\}\}/g, (_, key: string) => SUPABASE_PREVIEW_SAMPLES[key] ?? `{{ .${key} }}`)
}

// ---- Assignments (worksheets) ----

type DbAssignment = {
  id: string
  title: string
  description: string
  questions: unknown
  sort_order: number
  published: boolean
  locked?: boolean
  locked_at?: string | null
}

type DbSubmissionRow = {
  id: string
  assignment_id: string
  learner_id: string
  answers: Record<string, string | string[]>
  submitted_at: string
  locked?: boolean
  locked_at?: string | null
  learner_name?: string
  learner_phone?: string
  learner_first_name?: string
  learner_last_name?: string
}

function mapAssignment(row: DbAssignment): Assignment {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    questions: Array.isArray(row.questions) ? (row.questions as Assignment['questions']) : [],
    sortOrder: row.sort_order,
    published: row.published,
    locked: row.locked ?? false,
    lockedAt: row.locked_at ?? undefined,
  }
}

/** Old seeded worksheets used a stub description and a shifted question map. Prefer fresh generated content until the DB is re-synced. */
function needsGeneratedCatalogRefresh(assignment: Assignment): boolean {
  if (assignment.description.startsWith('EIF Programme worksheet')) return true
  const safety = assignment.questions.find((q) => q.id === 'q4_safety')
  return Boolean(safety?.label?.includes('What is your answer'))
}

function applyGeneratedCatalog(rows: Assignment[]): Assignment[] {
  const genById = new Map(generatedAssignments.map((a) => [a.id, a]))
  return rows.map((row) => {
    const gen = genById.get(row.id)
    if (!gen || !needsGeneratedCatalogRefresh(row)) return row
    return { ...gen, published: row.published, locked: row.locked, lockedAt: row.lockedAt }
  })
}

function mapSubmission(row: DbSubmissionRow): AssignmentSubmission {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    learnerId: row.learner_id,
    answers: row.answers ?? {},
    submittedAt: row.submitted_at,
    locked: row.locked ?? false,
    lockedAt: row.locked_at ?? undefined,
    learnerName: row.learner_name,
    learnerPhone: row.learner_phone,
    learnerFirstName: row.learner_first_name,
    learnerLastName: row.learner_last_name,
  }
}

function assignmentCatalogPayload() {
  return generatedAssignments.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    questions: a.questions,
    sortOrder: a.sortOrder,
    published: a.published,
  }))
}

export async function apiStaffUpsertAssignment(assignment: Assignment): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.rpc('lms_staff_upsert_assignment', {
    p_id: assignment.id,
    p_title: assignment.title,
    p_description: assignment.description,
    p_questions: assignment.questions,
    p_sort_order: assignment.sortOrder,
    p_published: assignment.published,
  })
  if (error) throw new Error(rpcErrorMessage(error))
}

export async function apiSyncAssignmentCatalog(catalog: Assignment[]): Promise<void> {
  for (const item of catalog) {
    await apiStaffUpsertAssignment(item)
  }
}

export async function apiEnsureAssignmentsSeeded(): Promise<void> {
  if (!isSupabaseDataEnabled() || !supabase) return
  const { error: seedError } = await supabase.rpc('lms_seed_assignments_if_empty', {
    p_items: assignmentCatalogPayload(),
  })
  if (seedError) throw new Error(rpcErrorMessage(seedError))

  // Staff-only refresh of stale worksheet copy (definitions / question map).
  // Skip quietly when the caller is a learner (no staff list permission).
  try {
    const existing = await apiStaffListAssignmentsRaw()
    const stale = existing.filter(
      (a) => a.id.startsWith('worksheet-') && needsGeneratedCatalogRefresh(a),
    )
    if (stale.length === 0) return
    await apiSyncAssignmentCatalog(
      generatedAssignments.filter((a) => stale.some((s) => s.id === a.id)),
    )
  } catch {
    // Learners (and any non-staff session) cannot list staff assignments.
  }
}

export async function apiFetchAssignments(): Promise<Assignment[]> {
  if (!isSupabaseDataEnabled()) return generatedAssignments.filter((a) => a.published)
  await apiEnsureAssignmentsSeeded()
  const { data, error } = await supabase!.rpc('lms_list_assignments')
  if (error) throw new Error(rpcErrorMessage(error))
  // The database is the source of truth: an empty list means staff have
  // unpublished everything, not that we should fall back to the repo catalog.
  return applyGeneratedCatalog((((data as DbAssignment[] | null) ?? [])).map(mapAssignment))
}

async function apiStaffListAssignmentsRaw(): Promise<Assignment[]> {
  if (!isSupabaseDataEnabled()) return generatedAssignments
  const { data, error } = await supabase!.rpc('lms_staff_list_assignments')
  if (error) throw new Error(rpcErrorMessage(error))
  return ((data as DbAssignment[] | null) ?? []).map(mapAssignment)
}

export async function apiStaffListAssignments(): Promise<Assignment[]> {
  return applyGeneratedCatalog(await apiStaffListAssignmentsRaw())
}

export async function apiGetMySubmission(assignmentId: string): Promise<AssignmentSubmission | null> {
  if (!isSupabaseDataEnabled() || !supabase) return null
  const { data, error } = await supabase.rpc('lms_get_my_submission', { p_assignment_id: assignmentId })
  if (error) throw new Error(rpcErrorMessage(error))
  if (!data) return null
  const row = data as DbSubmissionRow & { id: string | null }
  // "No submission" comes back as a row of all-null columns, not SQL null
  if (!row.id) return null
  return mapSubmission({ ...row, id: row.id })
}

export async function apiMySubmittedAssignmentIds(): Promise<string[]> {
  if (!isSupabaseDataEnabled() || !supabase) return []
  const { data, error } = await supabase.rpc('lms_my_submitted_assignment_ids')
  if (error) throw new Error(rpcErrorMessage(error))
  return ((data as string[] | null) ?? []).filter(Boolean)
}

export async function apiStaffSubmissionCounts(): Promise<Record<string, number>> {
  if (!isSupabaseDataEnabled() || !supabase) return {}
  const { data, error } = await supabase.rpc('lms_staff_submission_counts')
  if (error) throw new Error(rpcErrorMessage(error))
  const counts: Record<string, number> = {}
  for (const row of (data as { assignment_id: string; submission_count: number | string }[] | null) ?? []) {
    counts[row.assignment_id] = Number(row.submission_count) || 0
  }
  return counts
}

export async function apiStaffSetSubmissionLocked(
  submissionId: string,
  locked: boolean,
): Promise<AssignmentSubmission> {
  if (!isSupabaseDataEnabled() || !supabase) {
    throw new Error('Supabase not configured')
  }
  const { data, error } = await supabase.rpc('lms_staff_set_submission_locked', {
    p_submission_id: submissionId,
    p_locked: locked,
  })
  if (error) throw new Error(rpcErrorMessage(error))
  return mapSubmission(data as DbSubmissionRow)
}

export async function apiStaffSetAssignmentLocked(
  assignmentId: string,
  locked: boolean,
): Promise<Assignment> {
  if (!isSupabaseDataEnabled() || !supabase) {
    throw new Error('Supabase not configured')
  }
  const { data, error } = await supabase.rpc('lms_staff_set_assignment_locked', {
    p_assignment_id: assignmentId,
    p_locked: locked,
  })
  if (error) throw new Error(rpcErrorMessage(error))
  return mapAssignment(data as DbAssignment)
}

export async function apiSubmitAssignment(
  assignmentId: string,
  answers: Record<string, string | string[]>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseDataEnabled() || !supabase) {
    return {
      ok: false as const,
      error: 'Assignments are not connected to the server. Please try again later.',
    }
  }
  const { error } = await supabase.rpc('lms_submit_assignment', {
    p_assignment_id: assignmentId,
    p_answers: answers,
  })
  if (error) return { ok: false as const, error: rpcErrorMessage(error) }
  return { ok: true as const }
}

export async function apiStaffListSubmissions(assignmentId: string): Promise<AssignmentSubmission[]> {
  if (!isSupabaseDataEnabled()) {
    return shouldUseMockSubmissions(0) ? getMockSubmissionsForAssignment(assignmentId) : []
  }
  const { data, error } = await supabase!.rpc('lms_staff_list_submissions', {
    p_assignment_id: assignmentId,
  })
  if (error) throw new Error(rpcErrorMessage(error))
  const rows = ((data as DbSubmissionRow[] | null) ?? []).map(mapSubmission)
  if (shouldUseMockSubmissions(rows.length)) {
    return getMockSubmissionsForAssignment(assignmentId)
  }
  return rows
}
