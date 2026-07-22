export type UserRole = 'learner' | 'admin' | 'instructor'
export type AuthType = 'phone' | 'email'

export interface User {
  id: string
  name: string
  firstName: string
  lastName: string
  role: UserRole
  authType: AuthType
  createdAt: string
  phone?: string
  email?: string
  bio?: string
  location?: string
  jobTitle?: string
  updatedAt?: string
}

export interface ProfileUpdate {
  firstName: string
  lastName: string
  bio?: string
  location?: string
  jobTitle?: string
}

export interface LessonResource {
  label: string
  url: string
}

export interface Lesson {
  id: string
  title: string
  description: string
  videoUrl: string
  duration: string
  order: number
  /** Optional preview image — auto-captured from middle of uploaded videos */
  thumbnailUrl?: string
  /** What learners should know or do before watching */
  prerequisites?: string
  /** What learners will learn from this video */
  objectives?: string[]
  /** Main points to remember after watching */
  keyTakeaways?: string[]
  /** Worksheets, articles, downloads, etc. */
  resources?: LessonResource[]
}

export interface Course {
  id: string
  title: string
  description: string
  shortDescription?: string
  homepageContent?: string
  thumbnail: string
  heroImage?: string
  category: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  durationEstimate?: string
  timeToComplete?: string
  prerequisites?: string
  targetAudience?: string
  learningOutcomes?: string[]
  instructorName?: string
  instructorBio?: string
  certificateOffered?: boolean
  published?: boolean
  sortOrder?: number
  lessons: Lesson[]
}

export interface CourseProgress {
  userId: string
  courseId: string
  completedLessonIds: string[]
  lastLessonId?: string
  updatedAt: string
}

export type AssignmentQuestionType = 'text' | 'textarea' | 'checkbox' | 'radio'

export interface AssignmentQuestion {
  id: string
  label: string
  type: AssignmentQuestionType
  required?: boolean
  section?: string
  context?: string
  options?: string[]
}

export interface Assignment {
  id: string
  title: string
  description: string
  questions: AssignmentQuestion[]
  sortOrder: number
  published: boolean
  /** When true, learners cannot submit or update answers for this worksheet. */
  locked?: boolean
  lockedAt?: string
}

export interface AssignmentSubmission {
  id: string
  assignmentId: string
  learnerId: string
  answers: Record<string, string | string[]>
  submittedAt: string
  locked?: boolean
  lockedAt?: string
  learnerName?: string
  learnerPhone?: string
  learnerFirstName?: string
  learnerLastName?: string
}

export interface PendingStaffRequest {
  id: string
  email: string
  name: string
  firstName: string
  lastName: string
  role: 'admin' | 'instructor'
  requestedAt: string
}

export interface EmailTemplate {
  id: string
  name: string
  description: string
  category: 'learner' | 'admin' | 'system'
  subject: string
  bodyHtml: string
  bodyText: string
  variables: string[]
  syncToSupabaseAuth: boolean
  supabaseTemplateKey?: string
  supabaseSubject: string
  supabaseBodyHtml: string
  updatedAt: string
}
