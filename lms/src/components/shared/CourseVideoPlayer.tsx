import { useEffect, useState } from 'react'
import { Loader2, VideoOff } from 'lucide-react'
import { videoEmbedUrl, driveFileId, isDirectVideoUrl } from '@/utils/helpers'

type CourseVideoPlayerProps = {
  videoUrl: string
  title: string
}

export function CourseVideoPlayer({ videoUrl, title }: CourseVideoPlayerProps) {
  const embedUrl = videoEmbedUrl(videoUrl)
  const isDrive = Boolean(driveFileId(videoUrl))
  const isDirectFile = isDirectVideoUrl(videoUrl)
  const [ready, setReady] = useState(false)

  // New lesson selected -> show the loading state again
  useEffect(() => {
    setReady(false)
  }, [embedUrl])

  if (!embedUrl) {
    return (
      <div className="nf-video-frame">
        <div className="nf-video-frame__inner flex items-center justify-center">
          <div className="px-6 py-16 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2/80 text-muted ring-1 ring-border/60">
              <VideoOff className="h-6 w-6" aria-hidden />
            </span>
            <p className="mt-4 text-sm font-semibold text-fg">No video yet</p>
            <p className="mt-1 text-sm text-muted">
              A video for this lesson has not been added.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="nf-video-frame">
      <div className="nf-video-frame__inner">
        {!ready ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden />
              <p className="text-xs font-medium uppercase tracking-widest text-white/50">
                Loading video
              </p>
            </div>
          </div>
        ) : null}
        {isDirectFile ? (
          <video
            key={embedUrl}
            className="absolute inset-0 h-full w-full bg-black"
            src={embedUrl}
            title={title}
            controls
            playsInline
            preload="metadata"
            controlsList="nodownload"
            onLoadedData={() => setReady(true)}
            onError={() => setReady(true)}
          />
        ) : (
          <iframe
            className="absolute inset-0 h-full w-full border-0"
            src={embedUrl}
            title={title}
            onLoad={() => setReady(true)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            // Google Drive's preview player refuses to load with the stricter policy
            referrerPolicy={isDrive ? 'origin' : 'strict-origin-when-cross-origin'}
          />
        )}
      </div>
    </div>
  )
}
