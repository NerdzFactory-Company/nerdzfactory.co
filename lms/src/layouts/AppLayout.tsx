import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, BookOpen, User, GraduationCap, LayoutDashboard, ClipboardList } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useProgress } from '@/context/ProgressContext'
import { BRAND } from '@/content/brand'
import { formatPhoneDisplay } from '@/lib/phone'
import { getFirstName } from '@/utils/userDisplay'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { LearnerMobileNav } from '@/components/shared/LearnerMobileNav'
import { AdminMobileNav } from '@/components/shared/AdminMobileNav'
import { HeaderScrollNav } from '@/components/shared/HeaderScrollNav'
import { ButtonLink } from '@/components/ui/ButtonLink'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/helpers'

export function AppLayout() {
  const { user, signOut, isStaff } = useAuth()
  const { getOverallPercent } = useProgress()
  const navigate = useNavigate()
  const location = useLocation()
  const overall = getOverallPercent()

  const handleSignOut = async () => {
    if (!user) return
    const authType = user.authType
    await signOut()
    navigate(authType === 'email' ? '/admin/login' : '/login')
  }

  if (!user) return null

  const isStaffRoute = location.pathname.startsWith('/admin')
  const onLearnerHome = location.pathname === '/'
  const onAssignments = location.pathname.startsWith('/assignments')

  const showLearnerBottomNav = !isStaffRoute && user.authType === 'phone'
  const showAdminBottomNav = isStaffRoute && isStaff
  const showBottomNav = showLearnerBottomNav || showAdminBottomNav

  return (
    <div className="flex min-h-screen flex-col nf-mesh-bg text-fg">
      <header className="nf-header sticky top-0 z-40">
        <div className="nf-container flex min-w-0 items-center justify-between gap-2 py-2.5 sm:gap-3 sm:py-3">
          <div className="min-w-0 flex-1">
            <BrandLogo variant="header" to={isStaffRoute && isStaff ? '/admin/courses' : '/'} />
          </div>

          {/* Desktop inline nav */}
          <nav className="hidden shrink-0 items-center gap-1 lg:flex">
            {isStaffRoute ? (
              <>
                <NavLink to="/" active={false} icon={GraduationCap}>
                  Learner view
                </NavLink>
                <NavLink to="/admin/courses" active icon={LayoutDashboard}>
                  Staff panel
                </NavLink>
              </>
            ) : (
              <>
                <NavLink
                  to="/"
                  active={onLearnerHome || location.pathname.startsWith('/courses/')}
                  icon={GraduationCap}
                >
                  My courses
                </NavLink>
                <NavLink to="/assignments" active={onAssignments} icon={ClipboardList}>
                  Assignments
                </NavLink>
                {isStaff ? (
                  <NavLink to="/admin/courses" active={false} icon={LayoutDashboard}>
                    Staff panel
                  </NavLink>
                ) : null}
              </>
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <Link
              to="/profile"
              className="hidden min-w-0 items-center gap-2 rounded-xl border border-border/60 bg-surface/70 px-2.5 py-1.5 shadow-card transition-colors ring-focus hover:bg-surface-2 md:flex lg:px-3 lg:py-2"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent/25 to-accent/10 text-accent lg:h-8 lg:w-8">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden min-w-0 lg:block">
                <p className="max-w-[120px] truncate text-sm font-semibold leading-tight xl:max-w-[160px]">
                  {getFirstName(user)}
                </p>
                <p className="max-w-[120px] truncate text-[11px] text-muted xl:max-w-[160px]">
                  {user.email ?? (user.phone ? formatPhoneDisplay(user.phone) : 'Profile')}
                </p>
              </div>
            </Link>

            <ButtonLink
              to="/profile"
              variant="ghost"
              size="sm"
              className="md:hidden !w-auto px-2"
              aria-label="Your profile"
            >
              <User className="h-4 w-4" />
            </ButtonLink>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="!w-auto shrink-0 px-2 text-muted hover:text-fg sm:px-2.5"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden xl:inline">Sign out</span>
            </Button>
          </div>
        </div>

        {!showBottomNav ? <HeaderScrollNav /> : null}

        {overall > 0 && !isStaffRoute && user.authType === 'phone' ? (
          <div className="border-t border-border/40 bg-surface/50 lg:hidden">
            <div className="nf-container flex items-center gap-2 py-2 sm:gap-3">
              <BookOpen className="h-4 w-4 shrink-0 text-accent" />
              <ProgressBar value={overall} size="sm" showLabel className="min-w-0 flex-1" glow />
            </div>
          </div>
        ) : null}
      </header>

      <main
        className={cn(
          'nf-page min-w-0 flex-1',
          showBottomNav && 'pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] lg:pb-0',
        )}
      >
        <Outlet />
      </main>

      {showLearnerBottomNav ? <LearnerMobileNav /> : null}
      {showAdminBottomNav ? <AdminMobileNav /> : null}

      <footer
        className={cn(
          'nf-footer flex flex-col items-center gap-2 px-4 py-6 sm:py-8',
          showBottomNav && 'max-lg:hidden',
        )}
      >
        <BrandLogo variant="footer" />
        <p className="text-center text-xs text-muted">
          &copy; {new Date().getFullYear()} NerdzFactory Company &middot;{' '}
          <a href={BRAND.website} className="font-medium text-accent hover:underline">
            nerdzfactory.co
          </a>
        </p>
      </footer>
    </div>
  )
}

function NavLink({
  to,
  active,
  icon: Icon,
  children,
}: {
  to: string
  active: boolean
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all ring-focus',
        active
          ? 'bg-accent/15 text-accent shadow-sm'
          : 'text-muted hover:bg-surface-2/80 hover:text-fg',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap">{children}</span>
    </Link>
  )
}
