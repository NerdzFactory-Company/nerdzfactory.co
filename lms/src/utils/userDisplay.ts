import type { User } from '@/types'

export function formatFullName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
}

/** Greeting name — always prefer first name */
export function getFirstName(user: Pick<User, 'firstName' | 'name'> | null | undefined): string {
  if (!user) return 'there'
  const first = user.firstName?.trim()
  if (first) return first
  const fromName = user.name?.trim().split(/\s+/)[0]
  return fromName || 'there'
}

export function getDisplayName(user: Pick<User, 'firstName' | 'lastName' | 'name'>): string {
  const full = formatFullName(user.firstName ?? '', user.lastName ?? '')
  if (full) return full
  return user.name?.trim() || 'Learner'
}

export function parseLegacyName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}
