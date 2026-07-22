import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { GraduationCap, KeyRound, Lock, Phone, User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type Step = 'details' | 'code' | 'password'

export function SignUpPage() {
  const { signUp, sendPhoneOtp, verifyPhoneOtpSignUp, completePhoneSignUp, phoneOtpEnabled, setAuthFlow } =
    useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'
  const [step, setStep] = useState<Step>('details')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (step === 'code' || step === 'password') {
      setAuthFlow('signup')
      return () => setAuthFlow('none')
    }
    setAuthFlow('none')
  }, [step, setAuthFlow])

  const handleDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!firstName.trim()) {
      setError('Please enter your first name.')
      return
    }
    if (!lastName.trim()) {
      setError('Please enter your last name.')
      return
    }

    if (phoneOtpEnabled) {
      setLoading(true)
      const result = await sendPhoneOtp(phone, 'signup')
      setLoading(false)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSent(true)
      setStep('code')
      return
    }

    setLoading(true)
    const result = await signUp(phone, firstName, lastName)
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate(from)
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setAuthFlow('signup')
    setLoading(true)
    const result = await verifyPhoneOtpSignUp(phone, code)
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setStep('password')
  }

  const handlePassword = async (e: React.FormEvent) => {
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
    const result = await completePhoneSignUp(phone, firstName, lastName, password)
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate(from)
  }

  return (
    <div className="nf-auth-panel">
      <div className="mb-6 text-center sm:mb-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/25 to-gold/10 text-gold ring-1 ring-gold/20 sm:h-14 sm:w-14">
          <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>
        <h1 className="text-xl font-extrabold text-fg sm:text-2xl md:text-3xl">Start learning today</h1>
        <p className="mt-2 text-sm text-muted sm:text-base">
          {phoneOtpEnabled
            ? step === 'password'
              ? 'Choose a password. You will use your phone number and password to sign in.'
              : 'Enter your name and phone number to create your account.'
            : 'Your name and phone number are all you need to get started.'}
        </p>
      </div>

      {step === 'details' ? (
        <form onSubmit={handleDetails} className="space-y-4 sm:space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              name="firstName"
              type="text"
              autoComplete="given-name"
              placeholder="Ada"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              leadingIcon={<User className="h-5 w-5" />}
              className="nf-input-glow"
            />
            <Input
              label="Last name"
              name="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Okonkwo"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="nf-input-glow"
            />
          </div>
          <Input
            label="Phone number"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="e.g. 0801 234 5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leadingIcon={<Phone className="h-5 w-5" />}
            hint={
              phoneOtpEnabled
                ? 'We will text you a one-time verification code.'
                : 'We use this to sign you in. No password needed.'
            }
            error={error}
            className="nf-input-glow"
          />
          <Button type="submit" size="lg" pill fullWidth loading={loading}>
            {phoneOtpEnabled ? 'Send code' : 'Create account'}
          </Button>
        </form>
      ) : step === 'code' ? (
        <form onSubmit={handleVerify} className="space-y-4 sm:space-y-5">
          {sent ? (
            <p className="rounded-lg bg-success/10 px-4 py-3 text-center text-sm text-success">
              Code sent to your phone!
            </p>
          ) : null}
          <Input
            label="6-digit code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            leadingIcon={<KeyRound className="h-5 w-5" />}
            hint="Enter the code from your SMS. It expires in 10 minutes."
            error={error}
            className="nf-input-glow"
          />
          <Button type="submit" size="lg" pill fullWidth loading={loading}>
            Verify phone
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep('details')
              setCode('')
              setError('')
            }}
            className="w-full py-1 text-center text-sm font-medium text-accent hover:underline"
          >
            Go back
          </button>
        </form>
      ) : (
        <form onSubmit={handlePassword} className="space-y-4 sm:space-y-5">
          <Input
            label="Password"
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
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            leadingIcon={<Lock className="h-5 w-5" />}
            error={error}
            className="nf-input-glow"
          />
          <Button type="submit" size="lg" pill fullWidth loading={loading}>
            Create account
          </Button>
        </form>
      )}

      <p className="mt-6 border-t border-border/50 pt-6 text-center text-sm text-muted sm:mt-8">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
