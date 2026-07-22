import { Globe, Mail, MapPin, Phone } from 'lucide-react'
import { BRAND } from '@/content/brand'
import { cn } from '@/utils/helpers'

type AuthCompanyDetailsProps = {
  className?: string
}

/** NerdzFactory company footer on the sign-in / sign-up pages. */
export function AuthCompanyDetails({ className }: AuthCompanyDetailsProps) {
  return (
    <footer className={cn('text-center text-xs leading-relaxed text-muted/70', className)}>
      <p className="text-sm font-bold tracking-tight text-fg/80">{BRAND.name}</p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent/80">
        {BRAND.tagline}
      </p>

      <address className="mx-auto mt-3 flex max-w-xs items-start justify-center gap-1.5 not-italic sm:max-w-sm">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted/50" aria-hidden />
        <span>
          <span className="font-semibold text-muted/85">{BRAND.headOfficeLabel}:</span>{' '}
          {BRAND.headOfficeAddress}
        </span>
      </address>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
        <a
          href={`tel:${BRAND.phone.replace(/\s/g, '')}`}
          className="inline-flex items-center gap-1.5 font-medium text-muted/85 hover:text-accent"
        >
          <Phone className="h-3.5 w-3.5 text-muted/50" aria-hidden />
          {BRAND.phone}
        </a>
        <a
          href={`mailto:${BRAND.email}`}
          className="inline-flex items-center gap-1.5 font-medium text-muted/85 hover:text-accent"
        >
          <Mail className="h-3.5 w-3.5 text-muted/50" aria-hidden />
          {BRAND.email}
        </a>
        <a
          href={BRAND.website}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 font-medium text-muted/85 hover:text-accent"
        >
          <Globe className="h-3.5 w-3.5 text-muted/50" aria-hidden />
          nerdzfactory.co
        </a>
      </div>
    </footer>
  )
}
