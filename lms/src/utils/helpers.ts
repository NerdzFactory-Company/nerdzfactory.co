import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/** True when a stored value contains rich HTML (vs legacy plain text). */
export function isRichHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value)
}

/** Wrap legacy plain text in paragraphs so the rich editor/renderer can show it. */
export function plainTextToHtml(text: string): string {
  if (!text) return ''
  if (isRichHtml(text)) return text
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** True when rich HTML has no visible text (empty editor, blank paragraphs, etc.). */
export function isRichTextEmpty(value: string): boolean {
  return !richTextToPlain(value).trim()
}

/** Plain-text version of possibly-rich content — for card previews, PDFs, etc. */
export function richTextToPlain(value: string): string {
  if (!value) return ''
  if (!isRichHtml(value)) return value
  const text = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

export function colorForName(name: string): string {
  const palette = ['#3e8cff', '#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777']
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return palette[Math.abs(hash) % palette.length]
}

export function ytEmbedUrl(url: string): string {
  const videoId = ytVideoId(url)
  if (!videoId) return url || ''

  const params = new URLSearchParams({
    modestbranding: '1',
    rel: '0',
    iv_load_policy: '3',
    playsinline: '1',
    color: 'white',
    controls: '1',
  })

  if (typeof window !== 'undefined') {
    params.set('origin', window.location.origin)
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}

export function ytVideoId(url: string): string {
  if (!url) return ''
  if (url.includes('/embed/')) {
    const embedMatch = url.match(/\/embed\/([^?&/]+)/)
    return embedMatch?.[1] ?? ''
  }
  const watch = url.match(/[?&]v=([^&]+)/)
  if (watch) return watch[1]
  const short = url.match(/youtu\.be\/([^?]+)/)
  if (short) return short[1]
  if (/^[\w-]{6,15}$/.test(url)) return url
  return ''
}

export function ytThumbnailUrl(videoUrl: string): string {
  const id = ytVideoId(videoUrl)
  return id ? `https://img.youtube.com/vi/${id}/2.jpg` : ''
}

/** YouTube auto-generates keyframes at ~25%, 50%, 75% (indices 1–3). Prefer the middle frame. */
export function ytThumbnailCandidates(videoUrl: string): string[] {
  const id = ytVideoId(videoUrl)
  if (!id) return []
  return [
    `https://img.youtube.com/vi/${id}/2.jpg`,
    `https://img.youtube.com/vi/${id}/1.jpg`,
    `https://img.youtube.com/vi/${id}/3.jpg`,
    `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
  ]
}

/** Extracts the file id from any Google Drive share link. */
export function driveFileId(url: string): string {
  if (!url || !url.includes('drive.google.com')) return ''
  const file = url.match(/\/file\/d\/([^/?#]+)/)
  if (file) return file[1]
  const byParam = url.match(/[?&]id=([^&#]+)/)
  if (byParam) return byParam[1]
  return ''
}

/** True for uploaded/direct video files that play in a native <video> tag. */
export function isDirectVideoUrl(url: string): boolean {
  if (!url) return false
  const clean = url.split('?')[0].split('#')[0].toLowerCase()
  if (/\.(mp4|webm|mov|m4v|ogv|ogg)$/.test(clean)) return true
  // Files uploaded from the admin panel live in the lms-media storage bucket
  return url.includes('/storage/v1/object/public/lms-media/')
}

/** Playable embed URL for a lesson video — YouTube, Google Drive, or an uploaded file. */
export function videoEmbedUrl(url: string): string {
  if (isDirectVideoUrl(url)) return url
  const driveId = driveFileId(url)
  if (driveId) return `https://drive.google.com/file/d/${driveId}/preview`
  return ytEmbedUrl(url)
}

/** Preview image for a lesson video — stored capture, YouTube mid-frame, or Google Drive. */
export function videoThumbnailUrl(videoUrl: string, storedThumbnail?: string): string {
  if (storedThumbnail?.trim()) return storedThumbnail.trim()
  if (isDirectVideoUrl(videoUrl)) return ''
  const driveId = driveFileId(videoUrl)
  if (driveId) return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1280`
  return ytThumbnailUrl(videoUrl)
}

/** Capture a JPEG frame from a direct video URL at the given ratio (0–1). */
export function captureVideoFrameAtRatio(videoUrl: string, ratio = 0.5): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.src = videoUrl

    const cleanup = () => {
      video.removeAttribute('src')
      video.load()
    }

    video.onloadedmetadata = () => {
      const duration = video.duration
      if (!Number.isFinite(duration) || duration <= 0) {
        cleanup()
        reject(new Error('Could not read video duration.'))
        return
      }
      const t = Math.max(0, Math.min(duration * ratio, duration - 0.05))
      video.currentTime = t
    }

    video.onseeked = () => {
      try {
        const w = video.videoWidth
        const h = video.videoHeight
        if (!w || !h) {
          cleanup()
          reject(new Error('Video has no frame dimensions.'))
          return
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          cleanup()
          reject(new Error('Could not capture frame.'))
          return
        }
        ctx.drawImage(video, 0, 0, w, h)
        canvas.toBlob(
          (blob) => {
            cleanup()
            if (blob) resolve(blob)
            else reject(new Error('Could not encode frame.'))
          },
          'image/jpeg',
          0.88,
        )
      } catch (e) {
        cleanup()
        reject(e instanceof Error ? e : new Error('Could not capture frame.'))
      }
    }

    video.onerror = () => {
      cleanup()
      reject(new Error('Could not load video for preview capture.'))
    }
  })
}
