import { useEffect, useState } from 'react'
import { useSiteImages } from '@/context/SiteImagesContext'
import { LazyImage } from '@/components/shared/LazyImage'
import { ytThumbnailCandidates } from '@/utils/helpers'

type CourseThumbnailProps = {
  src: string
  alt?: string
  className?: string
  /** Hero / LCP images load immediately; course cards defer until near the viewport. */
  priority?: boolean
}

export function CourseThumbnail({ src, alt = '', className, priority = false }: CourseThumbnailProps) {
  const { images } = useSiteImages()
  const fallback = images.courseFallback
  const candidates = (() => {
    if (!src?.trim()) return [fallback]
    const yt = ytThumbnailCandidates(src)
    if (yt.length) return [...yt, fallback]
    return [src, fallback]
  })()

  const [index, setIndex] = useState(0)
  const url = candidates[Math.min(index, candidates.length - 1)] ?? fallback

  useEffect(() => {
    setIndex(0)
  }, [src])

  return (
    <LazyImage
      src={url}
      alt={alt}
      fallbackSrc={fallback}
      priority={priority}
      wrapperClassName="block h-full w-full"
      className={className}
      onError={() => {
        setIndex((current) => (current + 1 < candidates.length ? current + 1 : current))
      }}
    />
  )
}
