import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Lock, Phone } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function LoginPage() {
  const { signIn, phoneOtpEnabled } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'
  const flashMessage = (location.state as { message?: string } | null)?.message
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await signIn(phone, phoneOtpEnabled ? password : undefined)
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="nf-auth-panel">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-extrabold text-fg sm:text-2xl">Welcome back</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
          {phoneOtpEnabled
            ? 'Sign in with the phone number and password you used when you signed up.'
            : 'Enter the phone number you used when you signed up.'}
        </p>
      </div>

      {flashMessage ? (
        <p className="mb-4 rounded-lg bg-success/10 px-4 py-3 text-center text-sm text-success">
          {flashMessage}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <Input
          label="Your phone number"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="e.g. 0801 234 5678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          leadingIcon={<Phone className="h-5 w-5" />}
          error={phoneOtpEnabled ? undefined : error}
          className="nf-input-glow"
        />
        {phoneOtpEnabled ? (
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leadingIcon={<Lock className="h-5 w-5" />}
            error={error}
            className="nf-input-glow"
          />
        ) : null}
        <Button type="submit" size="lg" pill fullWidth loading={loading}>
          Sign in
        </Button>
      </form>

      <div className="mt-6 space-y-2 border-t border-border/50 pt-6 text-center text-sm text-muted sm:mt-8">
        {phoneOtpEnabled ? (
          <p>
            <Link to="/forgot-password" className="font-semibold text-accent hover:underline">
              Forgot your password?
            </Link>
          </p>
        ) : null}
        <p>
          New here?{' '}
          <Link to="/signup" className="font-semibold text-accent hover:underline">
            Create an account
          </Link>
        </p>
      </div>

      <p className="mt-8 text-center text-[11px] text-muted/60">
        <Link to="/admin/login" className="hover:text-muted hover:underline">
          Staff sign in
        </Link>
      </p>
    </div>
  )
}
