import { BookOpen, GraduationCap, Phone, Sparkles } from 'lucide-react'
import { BRAND } from '@/content/brand'
import { IMAGES } from '@/content/images'
import { LazyImage } from '@/components/shared/LazyImage'
import { AuthPartnershipLockup } from '@/components/auth/AuthPartnershipLockup'

const highlights = [
  { icon: GraduationCap, label: 'Learn at your pace' },
  { icon: BookOpen, label: 'Short video lessons' },
  { icon: Phone, label: 'Sign in with phone' },
]

export function AuthMarketingBanner() {
  return (
    <aside className="nf-auth-marketing">
      <div className="nf-auth-marketing__glow" aria-hidden />

      <AuthPartnershipLockup onDarkBackground className="relative z-10" />
      <div className="relative z-10 flex flex-1 flex-col justify-center py-6 lg:py-10">
        <div className="grid items-center gap-8 xl:grid-cols-[1fr,minmax(220px,280px)] xl:gap-10">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden />
              NerdzFactory Learning
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-accent">
              {BRAND.tagline}
            </p>

            <h1 className="mt-4 text-3xl font-extrabold leading-[1.15] text-white xl:text-[2.75rem] xl:leading-tight">
              Skills that open doors.{' '}
              <span className="text-gradient-brand">Training that fits your life.</span>
            </h1>

            <p className="mt-5 max-w-md text-base leading-relaxed text-white/75 xl:text-lg">
              Watch practical lessons, track your progress, and grow with programs built by
              NerdzFactory. Sign up with your phone number in minutes.
            </p>

            <div className="mt-8 flex flex-wrap gap-2.5">
              {highlights.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur-sm"
                >
                  <Icon className="h-3.5 w-3.5 text-accent" aria-hidden />
                  {label}
                </span>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/25 text-white">
                <Phone className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Need help signing up?</p>
                <a
                  href={`tel:${BRAND.phone.replace(/\s/g, '')}`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Call {BRAND.phone}
                </a>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[280px] xl:max-w-none">
            <div
              className="pointer-events-none absolute -inset-3 rounded-[1.35rem] bg-gradient-to-br from-accent/30 via-transparent to-gold/25 blur-sm"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-2xl border border-white/15 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.55)] ring-1 ring-white/10">
              <LazyImage
                src={IMAGES.auth.marketing}
                alt=""
                wrapperClassName="block w-full"
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      <p className="relative z-10 text-xs text-white/40">
        &copy; {new Date().getFullYear()} NerdzFactory Company
      </p>
    </aside>
  )
}
