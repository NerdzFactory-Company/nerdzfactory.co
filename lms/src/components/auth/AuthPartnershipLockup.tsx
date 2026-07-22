import { BRAND, PROGRAM } from '@/content/brand'
import { IMAGES } from '@/content/images'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { LazyImage } from '@/components/shared/LazyImage'
import { useSiteImages } from '@/context/SiteImagesContext'
import { cn } from '@/utils/helpers'

type AuthPartnershipLockupProps = {
  /** Logo and text on the dark marketing panel */
  onDarkBackground?: boolean
  className?: string
}

export function AuthPartnershipLockup({
  onDarkBackground = false,
  className,
}: AuthPartnershipLockupProps) {
  const { images } = useSiteImages()

  if (onDarkBackground) {
    const logoSize = 'block h-auto w-full max-w-[120px] shrink object-contain xl:max-w-[140px]'

    return (
      <div className={cn('relative z-10 flex w-full flex-col items-center', className)}>
        <div className="flex w-full max-w-md items-center justify-center gap-3 xl:gap-4">
          <BrandLogo
            variant="auth"
            compact
            href={BRAND.website}
            className="w-auto shrink"
          />
          <p className="shrink-0 text-center text-[9px] font-bold uppercase leading-tight tracking-[0.12em] text-accent xl:text-[10px]">
            In partnership with
          </p>
          <LazyImage
            src={images.partnerLogo}
            fallbackSrc={IMAGES.auth.partnerLogo}
            alt={PROGRAM.fullName}
            priority
            className={logoSize}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex w-full flex-col items-center', className)}>
      <BrandLogo
        variant="auth"
        href={BRAND.website}
        className="relative z-10 w-full"
      />

      <div className="mt-5 w-full max-w-[280px] text-fg sm:max-w-xs">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-border/40" aria-hidden />
          <p className="shrink-0 text-center text-[10px] font-bold uppercase leading-tight tracking-[0.12em] text-accent">
            In partnership with
          </p>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-border to-border/40" aria-hidden />
        </div>

        <div className="mt-4 flex flex-col items-center">
          <LazyImage
            src={images.partnerLogo}
            fallbackSrc={IMAGES.auth.partnerLogo}
            alt={PROGRAM.fullName}
            priority
            className="block h-auto w-full max-w-[220px] object-contain sm:max-w-[240px]"
          />
        </div>
      </div>
    </div>
  )
}
