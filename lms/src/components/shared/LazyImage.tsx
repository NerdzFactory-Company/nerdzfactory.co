import { useEffect, useRef, useState, type ImgHTMLAttributes, type SyntheticEvent } from 'react'
import { cn } from '@/utils/helpers'

/** Start fetching slightly before the image scrolls into view. */
const ROOT_MARGIN = '400px'

export type LazyImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  /** Load immediately — header logos and other above-the-fold images. */
  priority?: boolean
  /** Used when the primary src fails (404, blocked, etc.). */
  fallbackSrc?: string
  /** Wrapper element class — use `block h-full w-full` for fill containers. */
  wrapperClassName?: string
}

/**
 * Deferred image loader for fast pages on slow networks.
 * - Below-the-fold: waits until near the viewport (Intersection Observer), then sets src.
 * - Above-the-fold: eager + fetchPriority high.
 * - All images: decoding="async", fade-in on load, optional fallback.
 */
export function LazyImage({
  src,
  alt = '',
  className,
  priority = false,
  fallbackSrc,
  wrapperClassName,
  onLoad,
  onError,
  ...rest
}: LazyImageProps) {
  const hostRef = useRef<HTMLSpanElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [activeSrc, setActiveSrc] = useState<string | undefined>(
    priority && src ? String(src) : undefined,
  )
  const [loaded, setLoaded] = useState(false)

  const srcKey = src ? String(src) : ''

  useEffect(() => {
    setLoaded(false)

    if (!srcKey) {
      setActiveSrc(undefined)
      return
    }

    if (priority) {
      setActiveSrc(srcKey)
      return
    }

    setActiveSrc(undefined)
    const host = hostRef.current
    if (!host) return

    if (typeof IntersectionObserver === 'undefined') {
      setActiveSrc(srcKey)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setActiveSrc(srcKey)
          observer.disconnect()
        }
      },
      { rootMargin: ROOT_MARGIN },
    )
    observer.observe(host)
    return () => observer.disconnect()
  }, [srcKey, priority])

  useEffect(() => {
    const img = imgRef.current
    if (!img || !activeSrc) return
    if (img.complete && img.naturalWidth > 0) setLoaded(true)
  }, [activeSrc])

  const handleLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    setLoaded(true)
    onLoad?.(e)
  }

  const handleError = (e: SyntheticEvent<HTMLImageElement>) => {
    if (fallbackSrc && activeSrc !== fallbackSrc) {
      setActiveSrc(fallbackSrc)
      setLoaded(false)
    }
    onError?.(e)
  }

  const waiting = Boolean(srcKey && !loaded)

  return (
    <span
      ref={hostRef}
      className={cn('relative block max-w-full', wrapperClassName)}
    >
      {waiting ? (
        <span
          className={cn(
            'pointer-events-none absolute inset-0 animate-pulse rounded-[inherit] bg-surface-2/70',
            className?.includes('object-cover') && 'object-cover',
          )}
          aria-hidden
        />
      ) : null}
      {activeSrc ? (
        <img
          ref={imgRef}
          src={activeSrc}
          alt={alt}
          decoding="async"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'nf-lazy-image max-w-full transition-opacity duration-300 ease-out',
            loaded ? 'opacity-100' : 'opacity-0',
            className,
          )}
          {...rest}
        />
      ) : (
        <span
          className={cn('block min-h-[1px] animate-pulse bg-surface-2/60', className)}
          aria-hidden
        />
      )}
    </span>
  )
}
