import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, Lock, Phone } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type Step = 'phone' | 'code' | 'password'

export function ForgotPasswordPage() {
  const { sendPhoneOtp, verifyPhoneOtpSignUp, completePhonePasswordReset, phoneOtpEnabled, setAuthFlow } =
    useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (step === 'code' || step === 'password') {
      setAuthFlow('recovery')
      return () => setAuthFlow('none')
    }
    setAuthFlow('none')
  }, [step, setAuthFlow])

  if (!phoneOtpEnabled) {
    return (
      <div className="nf-auth-panel text-center">
        <h1 className="text-xl font-extrabold text-fg">Password reset</h1>
        <p className="mt-3 text-sm text-muted">
          Password reset needs text-message sign-in. Please contact support if you need help.
        </p>
        <Link to="/login" className="mt-6 inline-block font-semibold text-accent hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await sendPhoneOtp(phone, 'recovery')
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSent(true)
    setStep('code')
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setAuthFlow('recovery')
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
    const result = await completePhonePasswordReset(phone, password)
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate('/login', { state: { message: 'Password updated. Sign in with your new password.' } })
  }

  return (
    <div className="nf-auth-panel">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-extrabold text-fg sm:text-2xl">Reset your password</h1>
        <p className="mt-2 text-sm text-muted sm:text-base">
          {step === 'phone'
            ? 'Enter your phone number and we will text you a verification code.'
            : step === 'code'
              ? 'Enter the code we sent to your phone.'
              : 'Choose a new password for your account.'}
        </p>
      </div>

      {step === 'phone' ? (
        <form onSubmit={handleSendCode} className="space-y-4 sm:space-y-5">
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
            error={error}
            className="nf-input-glow"
          />
          <Button type="submit" size="lg" pill fullWidth loading={loading}>
            Send code
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
            error={error}
            className="nf-input-glow"
          />
          <Button type="submit" size="lg" pill fullWidth loading={loading}>
            Verify code
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep('phone')
              setCode('')
              setError('')
              setSent(false)
            }}
            className="w-full py-1 text-center text-sm font-medium text-accent hover:underline"
          >
            Go back
          </button>
        </form>
      ) : (
        <form onSubmit={handlePassword} className="space-y-4 sm:space-y-5">
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
          <button
            type="button"
            onClick={() => {
              setStep('code')
              setPassword('')
              setConfirmPassword('')
              setError('')
            }}
            className="w-full py-1 text-center text-sm font-medium text-accent hover:underline"
          >
            Go back
          </button>
        </form>
      )}

      <p className="mt-6 border-t border-border/50 pt-6 text-center text-sm text-muted sm:mt-8">
        <Link to="/login" className="font-semibold text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
