import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Lock, Mail, Shield } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { apiAdminRequestPasswordReset } from '@/lib/supabase/lmsApi'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function AdminLoginPage() {
  const { adminSignIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/admin/courses'
  const flashMessage = (location.state as { message?: string } | null)?.message
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    const result = await adminSignIn(email, password)
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate(from, { replace: true })
  }

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email first, then tap Forgot password.')
      return
    }
    setError('')
    setInfo('')
    setResetLoading(true)
    const result = await apiAdminRequestPasswordReset(email.trim())
    setResetLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setInfo('Reset link sent. Check your inbox.')
  }

  return (
    <div className="nf-auth-panel">
      <div className="mb-6 text-center sm:mb-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/25 to-gold/10 text-gold ring-1 ring-gold/20 sm:h-14 sm:w-14">
          <Shield className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>
        <h1 className="text-xl font-extrabold text-fg sm:text-2xl md:text-3xl">Staff sign in</h1>
        <p className="mt-2 text-sm text-muted sm:text-base">
          Manage courses, learners, and training content.
        </p>
      </div>

      {flashMessage ? (
        <p className="mb-4 rounded-lg bg-success/10 px-4 py-3 text-center text-sm text-success">
          {flashMessage}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <Input
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@nerdzfactory.co"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leadingIcon={<Mail className="h-5 w-5" />}
          className="nf-input-glow"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leadingIcon={<Lock className="h-5 w-5" />}
          error={error}
          className="nf-input-glow"
        />

        <div className="flex justify-start">
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={resetLoading}
            className="text-sm font-medium text-accent hover:underline disabled:opacity-50"
          >
            {resetLoading ? 'Sending…' : 'Forgot password?'}
          </button>
        </div>

        {info ? <p className="text-sm text-success">{info}</p> : null}

        <Button type="submit" size="lg" pill fullWidth loading={loading}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 border-t border-border/50 pt-6 text-center text-sm text-muted sm:mt-8">
        New staff member?{' '}
        <Link to="/admin/signup/instructor" className="font-semibold text-accent hover:underline">
          Sign up as instructor
        </Link>
        {' · '}
        <Link to="/admin/signup/admin" className="font-semibold text-accent hover:underline">
          Sign up as admin
        </Link>
      </p>

      <p className="mt-4 text-center text-sm text-muted">
        Learning as a student?{' '}
        <Link to="/login" className="font-semibold text-accent hover:underline">
          Sign in with phone
        </Link>
      </p>
    </div>
  )
}
