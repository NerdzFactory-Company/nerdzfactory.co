import { Link } from 'react-router-dom'
import { BRAND } from '@/content/brand'
import { IMAGES } from '@/content/images'
import { useSiteImages } from '@/context/SiteImagesContext'
import { LazyImage } from '@/components/shared/LazyImage'
import { cn } from '@/utils/helpers'

const LOGO_SIZE_HEADER =
  'h-9 w-auto max-w-[140px] object-contain object-left sm:h-11 sm:max-w-[200px] md:max-w-[220px]'
const LOGO_SIZE_AUTH =
  'h-14 w-auto max-w-[260px] object-contain object-center sm:h-16 sm:max-w-[300px] md:h-[4.5rem] md:max-w-[320px]'
const LOGO_SIZE_AUTH_COMPACT =
  'h-auto w-full max-w-[120px] object-contain object-center xl:max-w-[140px]'
const LOGO_SIZE_FOOTER = 'h-11 w-auto max-w-[200px] object-contain object-center sm:h-12 sm:max-w-[220px]'

type BrandLogoProps = {
  variant?: 'header' | 'auth' | 'footer'
  /** Smaller auth lockup for the desktop marketing panel. */
  compact?: boolean
  to?: string
  href?: string
  className?: string
}

function logoSizeClass(variant: 'header' | 'auth' | 'footer', compact?: boolean) {
  if (variant === 'auth') return compact ? LOGO_SIZE_AUTH_COMPACT : LOGO_SIZE_AUTH
  if (variant === 'footer') return LOGO_SIZE_FOOTER
  return LOGO_SIZE_HEADER
}

export function BrandLogo({
  variant = 'header',
  compact = false,
  to = '/',
  href,
  className,
}: BrandLogoProps) {
  const { images } = useSiteImages()
  const src = images.logoOnDark
  const priority = variant === 'header' || variant === 'auth'

  const img = (
    <LazyImage
      src={src}
      fallbackSrc={IMAGES.logo.onDark}
      alt={BRAND.name}
      priority={priority}
      className={cn(logoSizeClass(variant, compact), 'block')}
    />
  )

  const content =
    variant === 'header' ? (
      <span className="flex min-w-0 items-center">
        {img}
        <span className="ml-2 hidden min-w-0 border-l border-border/60 pl-2 sm:ml-3 sm:pl-3 xl:block">
          <p className="truncate text-sm font-bold leading-tight text-fg">Learning</p>
          <p className="truncate text-[11px] text-accent/80">Human capital development</p>
        </span>
      </span>
    ) : (
      img
    )

  const linkClass = cn(
    'group shrink-0 rounded-lg ring-focus',
    variant === 'header' && 'inline-flex',
    variant === 'auth' && compact && 'inline-flex',
    variant === 'auth' && !compact && 'flex w-full justify-center',
    variant === 'footer' && 'flex w-full justify-center',
    className,
  )

  if (variant === 'footer') {
    return (
      <div className="flex w-full justify-center">
        <Link to={to} className={linkClass} aria-label="My courses">
          <span className="transition-transform duration-300 group-hover:scale-[1.02]">{content}</span>
        </Link>
      </div>
    )
  }

  if (href) {
    return (
      <a href={href} className={linkClass} aria-label={`${BRAND.name} website`}>
        <span className="flex justify-center transition-transform duration-300 group-hover:scale-[1.02]">
          {content}
        </span>
      </a>
    )
  }

  return (
    <Link to={to} className={linkClass} aria-label="My courses" title="Back to my courses">
      <span className="transition-transform duration-300 group-hover:scale-[1.02]">{content}</span>
    </Link>
  )
}
