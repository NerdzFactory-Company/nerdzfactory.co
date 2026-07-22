import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { apiUpdateAuthUserPassword } from '@/lib/supabase/lmsApi'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function AdminResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setChecking(false)
      setError('Password reset is not available right now. Please contact your administrator.')
      return
    }

    let recoveryAccepted = false
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryAccepted = true
        setReady(true)
        setChecking(false)
      }
    })

    const timer = setTimeout(() => {
      if (!recoveryAccepted) setChecking(false)
    }, 4000)

    return () => {
      sub.subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    const result = await apiUpdateAuthUserPassword(password)
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    await supabase?.auth.signOut()
    navigate('/admin/login', {
      state: { message: 'Password updated. Sign in with your new password.' },
    })
  }

  if (checking) {
    return (
      <div className="nf-auth-panel flex justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="nf-auth-panel text-center">
        <Shield className="mx-auto h-10 w-10 text-muted" />
        <h1 className="mt-4 text-xl font-extrabold text-fg">Reset link invalid or expired</h1>
        <p className="mt-2 text-sm text-muted">
          Request a new password reset from the staff sign-in page.
        </p>
        <Link to="/admin/login" className="mt-6 inline-block font-semibold text-accent hover:underline">
          Back to staff sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="nf-auth-panel">
      <div className="mb-6 text-center sm:mb-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/25 to-gold/10 text-gold ring-1 ring-gold/20">
          <Shield className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-extrabold text-fg sm:text-2xl">Set a new password</h1>
        <p className="mt-2 text-sm text-muted">Choose a new password for your staff account.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <Input
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leadingIcon={<Lock className="h-5 w-5" />}
          className="nf-input-glow"
        />
        <Input
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leadingIcon={<Lock className="h-5 w-5" />}
          error={error}
          className="nf-input-glow"
        />
        <Button type="submit" size="lg" pill fullWidth loading={loading}>
          Update password
        </Button>
      </form>
    </div>
  )
}
