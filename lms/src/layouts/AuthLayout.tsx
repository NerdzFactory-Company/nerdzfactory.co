import { Outlet, useLocation } from 'react-router-dom'
import { AuthPartnershipLockup } from '@/components/auth/AuthPartnershipLockup'
import { AuthCompanyDetails } from '@/components/auth/AuthCompanyDetails'

const LEARNER_AUTH_PATHS = new Set(['/login', '/signup'])

export function AuthLayout() {
  const { pathname } = useLocation()
  const showOfficeAddress = LEARNER_AUTH_PATHS.has(pathname)

  return (
    <div className="nf-auth-shell">
      <main className="nf-auth-main min-h-screen">
        <div className="mb-6 w-full max-w-md text-center">
          <AuthPartnershipLockup />
        </div>

        <div className="w-full max-w-md min-w-0 px-1 sm:px-0 animate-fade-in">
          <Outlet />
        </div>

        {showOfficeAddress ? (
          <AuthCompanyDetails className="mt-6 w-full max-w-md sm:mt-8" />
        ) : null}

        <p className="mt-6 text-center text-xs text-muted sm:mt-8">
          &copy; {new Date().getFullYear()} NerdzFactory Company
        </p>
      </main>
    </div>
  )
}
