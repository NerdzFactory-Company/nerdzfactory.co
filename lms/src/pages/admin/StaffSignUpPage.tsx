import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { GraduationCap, Lock, Mail, Shield, User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function StaffSignUpPage() {
  const { role: roleParam } = useParams<{ role: string }>()
  const role = roleParam === 'admin' ? 'admin' : 'instructor'
  const { staffSignUp } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isAdmin = role === 'admin'
  const title = isAdmin ? 'Sign up as admin' : 'Sign up as instructor'
  const subtitle = isAdmin
    ? 'Create an admin account. An existing admin must approve you before you can sign in.'
    : 'Create an instructor account. An existing admin must approve you before you can sign in.'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const result = await staffSignUp(email, password, firstName, lastName, role)
    setLoading(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    navigate('/admin/login', {
      replace: true,
      state: {
        message: isAdmin
          ? 'Your admin request was submitted. You will be able to sign in after an existing admin approves your account.'
          : 'Your instructor request was submitted. You will be able to sign in after an existing admin approves your account.',
      },
    })
  }

  return (
    <div className="nf-auth-panel">
      <div className="mb-6 text-center sm:mb-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/25 to-gold/10 text-gold ring-1 ring-gold/20 sm:h-14 sm:w-14">
          <Shield className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>
        <h1 className="text-xl font-extrabold text-fg sm:text-2xl md:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-muted sm:text-base">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            name="firstName"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            leadingIcon={<User className="h-5 w-5" />}
            required
            className="nf-input-glow"
          />
          <Input
            label="Last name"
            name="lastName"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            leadingIcon={<User className="h-5 w-5" />}
            required
            className="nf-input-glow"
          />
        </div>

        <Input
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@nerdzfactory.co"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leadingIcon={<Mail className="h-5 w-5" />}
          required
          className="nf-input-glow"
        />

        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leadingIcon={<Lock className="h-5 w-5" />}
          required
          className="nf-input-glow"
        />

        <Input
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leadingIcon={<Lock className="h-5 w-5" />}
          error={error}
          required
          className="nf-input-glow"
        />

        <Button type="submit" size="lg" pill fullWidth loading={loading}>
          {isAdmin ? 'Request admin access' : 'Create instructor account'}
        </Button>
      </form>

      <p className="mt-6 border-t border-border/50 pt-6 text-center text-sm text-muted sm:mt-8">
        Already have a staff account?{' '}
        <Link to="/admin/login" className="font-semibold text-accent hover:underline">
          Sign in
        </Link>
      </p>

      <p className="mt-4 text-center text-sm text-muted">
        {isAdmin ? (
          <>
            Want to teach instead?{' '}
            <Link to="/admin/signup/instructor" className="font-semibold text-accent hover:underline">
              Sign up as instructor
            </Link>
          </>
        ) : (
          <>
            Need full admin access?{' '}
            <Link to="/admin/signup/admin" className="font-semibold text-accent hover:underline">
              Sign up as admin
            </Link>
          </>
        )}
      </p>

      <p className="mt-4 text-center text-sm text-muted">
        Learning as a student?{' '}
        <Link to="/login" className="font-semibold text-accent hover:underline">
          <GraduationCap className="mr-1 inline h-4 w-4 align-text-bottom" />
          Sign in with phone
        </Link>
      </p>
    </div>
  )
}
