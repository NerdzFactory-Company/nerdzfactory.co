import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { CoursesProvider } from '@/context/CoursesContext'
import { ProgressProvider } from '@/context/ProgressContext'
import { SiteImagesProvider } from '@/context/SiteImagesContext'
import { InactivityGuard } from '@/components/auth/InactivityGuard'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AppLayout } from '@/layouts/AppLayout'
import { PageSpinner } from '@/components/shared/PageSpinner'
import { isSupabaseConfigured } from '@/lib/supabase'

const LoginPage = lazy(() => import('@/pages/Login').then((m) => ({ default: m.LoginPage })))
const SignUpPage = lazy(() => import('@/pages/SignUp').then((m) => ({ default: m.SignUpPage })))
const ForgotPasswordPage = lazy(() =>
  import('@/pages/ForgotPassword').then((m) => ({ default: m.ForgotPasswordPage })),
)
const DashboardPage = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.DashboardPage })))
const CourseHomePage = lazy(() =>
  import('@/pages/CourseHomePage').then((m) => ({ default: m.CourseHomePage })),
)
const CoursePlayerPage = lazy(() =>
  import('@/pages/CoursePlayer').then((m) => ({ default: m.CoursePlayerPage })),
)
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const AdminLoginPage = lazy(() =>
  import('@/pages/admin/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })),
)
const StaffSignUpPage = lazy(() =>
  import('@/pages/admin/StaffSignUpPage').then((m) => ({ default: m.StaffSignUpPage })),
)
const AdminResetPasswordPage = lazy(() =>
  import('@/pages/admin/AdminResetPasswordPage').then((m) => ({ default: m.AdminResetPasswordPage })),
)
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })))
const AdminOverviewPage = lazy(() =>
  import('@/pages/admin/AdminOverviewPage').then((m) => ({ default: m.AdminOverviewPage })),
)
const AdminCoursesPage = lazy(() =>
  import('@/pages/admin/AdminCoursesPage').then((m) => ({ default: m.AdminCoursesPage })),
)
const AdminCourseEditPage = lazy(() =>
  import('@/pages/admin/AdminCourseEditPage').then((m) => ({ default: m.AdminCourseEditPage })),
)
const AdminLearnersPage = lazy(() =>
  import('@/pages/admin/AdminLearnersPage').then((m) => ({ default: m.AdminLearnersPage })),
)
const AdminAssignmentSubmissionsPage = lazy(() =>
  import('@/pages/admin/AdminAssignmentSubmissionsPage').then((m) => ({
    default: m.AdminAssignmentSubmissionsPage,
  })),
)
const AdminAssignmentSubmissionPage = lazy(() =>
  import('@/pages/admin/AdminAssignmentSubmissionPage').then((m) => ({
    default: m.AdminAssignmentSubmissionPage,
  })),
)
const AdminAssignmentsPage = lazy(() =>
  import('@/pages/admin/AdminAssignmentsPage').then((m) => ({ default: m.AdminAssignmentsPage })),
)
const AdminMediaPage = lazy(() =>
  import('@/pages/admin/AdminMediaPage').then((m) => ({ default: m.AdminMediaPage })),
)
const AdminAssignmentEditPage = lazy(() =>
  import('@/pages/admin/AdminAssignmentEditPage').then((m) => ({
    default: m.AdminAssignmentEditPage,
  })),
)
const AssignmentsPage = lazy(() =>
  import('@/pages/AssignmentsPage').then((m) => ({ default: m.AssignmentsPage })),
)
const AssignmentTakePage = lazy(() =>
  import('@/pages/AssignmentTakePage').then((m) => ({ default: m.AssignmentTakePage })),
)

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center nf-mesh-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className="text-sm text-muted">Loading...</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, bootstrapping, refreshing } = useAuth()
  const location = useLocation()
  if (bootstrapping) return <LoadingScreen />
  if (!user && refreshing) return <LoadingScreen />
  if (!user) {
    const loginTo = location.pathname.startsWith('/admin') ? '/admin/login' : '/login'
    return <Navigate to={loginTo} replace state={{ from: location }} />
  }
  return <>{children}</>
}

function StaffRoute({ children }: { children: React.ReactNode }) {
  const { user, isStaff, bootstrapping, refreshing } = useAuth()
  const location = useLocation()
  if (bootstrapping) return <LoadingScreen />
  if ((!user || !isStaff) && refreshing) return <LoadingScreen />
  if (!user || !isStaff) return <Navigate to="/admin/login" replace state={{ from: location }} />
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-md py-20 px-4 text-center">
        <p className="text-lg font-semibold text-fg">Staff area is not available yet</p>
        <p className="mt-2 text-sm text-muted">
          The learning platform is not ready for staff yet. Please contact whoever manages this
          site to complete setup.
        </p>
      </div>
    )
  }
  return <>{children}</>
}

function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, bootstrapping, refreshing } = useAuth()
  const location = useLocation()
  if (bootstrapping) return <LoadingScreen />
  if ((!user || !isAdmin) && refreshing) return <LoadingScreen />
  if (!user || !isAdmin) return <Navigate to="/admin/courses" replace state={{ from: location }} />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  return <StaffRoute>{children}</StaffRoute>
}

function LearnerPublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isStaff, bootstrapping } = useAuth()
  if (bootstrapping) return <LoadingScreen />
  if (user) return <Navigate to={isStaff ? '/admin/courses' : '/'} replace />
  return <>{children}</>
}

function AdminPublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isStaff, bootstrapping } = useAuth()
  if (bootstrapping) return <LoadingScreen />
  if (user && isStaff) return <Navigate to="/admin/courses" replace />
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

function CatchAllRoute() {
  const { user, isStaff, bootstrapping, refreshing } = useAuth()
  if (bootstrapping) return <LoadingScreen />
  if (!user && refreshing) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={isStaff ? '/admin/courses' : '/'} replace />
}

function AppShell() {
  return (
    <CoursesProvider>
      <ProgressProvider>
        <AppLayout />
      </ProgressProvider>
    </CoursesProvider>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        element={
          <Suspense fallback={<LoadingScreen />}>
            <AuthLayout />
          </Suspense>
        }
      >
          <Route
            path="/login"
            element={
              <LearnerPublicRoute>
                <LoginPage />
              </LearnerPublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <LearnerPublicRoute>
                <SignUpPage />
              </LearnerPublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <LearnerPublicRoute>
                <ForgotPasswordPage />
              </LearnerPublicRoute>
            }
          />
          <Route
            path="/admin/login"
            element={
              <AdminPublicRoute>
                <AdminLoginPage />
              </AdminPublicRoute>
            }
          />
          <Route
            path="/admin/signup/:role"
            element={
              <AdminPublicRoute>
                <StaffSignUpPage />
              </AdminPublicRoute>
            }
          />
          <Route path="/admin/reset-password" element={<AdminResetPasswordPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageSpinner className="py-24" />}>
              <AppShell />
            </Suspense>
          </ProtectedRoute>
        }
      >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/assignments" element={<AssignmentsPage />} />
          <Route path="/assignments/:assignmentId" element={<AssignmentTakePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/courses/:courseId" element={<CourseHomePage />} />
          <Route path="/courses/:courseId/learn" element={<CoursePlayerPage />} />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminOnlyRoute><AdminOverviewPage /></AdminOnlyRoute>} />
            <Route path="courses" element={<AdminCoursesPage />} />
            <Route path="courses/new" element={<AdminCourseEditPage />} />
            <Route path="courses/:courseId" element={<AdminCourseEditPage />} />
            <Route path="learners" element={<AdminLearnersPage />} />
            <Route path="media" element={<AdminOnlyRoute><AdminMediaPage /></AdminOnlyRoute>} />
            <Route path="assignments" element={<AdminAssignmentsPage />} />
            <Route path="assignments/new" element={<AdminAssignmentEditPage />} />
            <Route path="assignments/:assignmentId/edit" element={<AdminAssignmentEditPage />} />
            <Route path="assignments/:assignmentId/submissions" element={<AdminAssignmentSubmissionsPage />} />
            <Route
              path="assignments/:assignmentId/submissions/:submissionId"
              element={<AdminAssignmentSubmissionPage />}
            />
          </Route>
      </Route>

      <Route path="*" element={<CatchAllRoute />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SiteImagesProvider>
          <InactivityGuard />
          <AppRoutes />
        </SiteImagesProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
