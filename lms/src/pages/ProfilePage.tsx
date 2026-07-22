import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, MapPin, Save, User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { formatPhoneDisplay } from '@/lib/phone'
import { getFirstName } from '@/utils/userDisplay'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { BackLink } from '@/components/shared/BackLink'

export function ProfilePage() {
  const { user, updateProfile, isStaff } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    setFirstName(user.firstName ?? '')
    setLastName(user.lastName ?? '')
    setBio(user.bio ?? '')
    setLocation(user.location ?? '')
    setJobTitle(user.jobTitle ?? '')
  }, [user])


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError('')
    setMessage('')
    const result = await updateProfile({
      firstName,
      lastName,
      bio,
      location,
      jobTitle,
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessage('Profile saved.')
  }

  if (!user) return null

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-6">
      <BackLink to={isStaff ? '/admin/courses' : '/'}>
        {isStaff ? 'Back to admin' : 'Back to my courses'}
      </BackLink>

      <div>
        <p className="nf-tagline">Your profile</p>
        <h1 className="mt-1 text-2xl font-extrabold text-fg sm:text-3xl">
          Hi, {getFirstName(user)}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Keep your name and details up to date. We use your first name when we greet you in the app.
        </p>
      </div>

      <Card padding="lg" className="space-y-5">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              name="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
              leadingIcon={<User className="h-5 w-5" />}
            />
            <Input
              label="Last name"
              name="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
            />
          </div>

          {user.phone ? (
            <Input
              label="Phone number"
              value={formatPhoneDisplay(user.phone)}
              disabled
              hint="Phone is used to sign in and cannot be changed here."
            />
          ) : null}

          {user.email ? (
            <Input
              label="Email address"
              value={user.email}
              disabled
              hint="Email is used for admin sign-in."
            />
          ) : null}

          <Input
            label="Job title"
            name="jobTitle"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Student, Entrepreneur"
            leadingIcon={<Briefcase className="h-5 w-5" />}
          />

          <Input
            label="Location"
            name="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Lagos, Nigeria"
            leadingIcon={<MapPin className="h-5 w-5" />}
          />

          <Textarea
            label="About you"
            name="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short bio — your goals, interests, or what you are learning for."
            rows={4}
          />

          <Button type="submit" pill fullWidth loading={saving} className="sm:!w-auto">
            <Save className="h-4 w-4" />
            Save profile
          </Button>

          {message ? <p className="text-sm text-success">{message}</p> : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </form>
      </Card>

      {user.role === 'learner' ? (
        <p className="text-center text-sm text-muted">
          <Link to="/" className="font-semibold text-accent hover:underline">
            Back to my courses
          </Link>
        </p>
      ) : null}
    </div>
  )
}
