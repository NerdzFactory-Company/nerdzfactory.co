import { GraduationCap, LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ButtonLink } from '@/components/ui/ButtonLink'

export function AdminPreviewBanner() {
  const { isStaff } = useAuth()
  if (!isStaff) return null

  return (
    <div className="relative z-10 mb-6 flex flex-col gap-3 rounded-xl border border-gold/30 bg-gold/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-fg">
        <span className="font-semibold">Viewing as a learner</span> — this is what learners see on their dashboard, assignments, and in courses.
      </p>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <ButtonLink to="/" variant="primary" size="sm" fullWidth className="w-full sm:!w-auto">
          <GraduationCap className="h-4 w-4" />
          My courses
        </ButtonLink>
        <ButtonLink to="/admin/courses" variant="secondary" size="sm" fullWidth className="w-full sm:!w-auto">
          <LayoutDashboard className="h-4 w-4" />
          Back to staff panel
        </ButtonLink>
      </div>
    </div>
  )
}
