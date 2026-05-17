import type { AnnouncementMedia } from '@/types'

export class MediaUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MediaUploadError'
  }
}

function inferKind(file: File): AnnouncementMedia['kind'] {
  return file.type.startsWith('video/') ? 'video' : 'image'
}

/**
 * Sends multipart form field "file" to VITE_MEDIA_UPLOAD_URL.
 * Expects JSON: { "url": "https://..." } or { "ok": true, "url": "..." }.
 */
export async function uploadAnnouncementMedia(file: File): Promise<AnnouncementMedia> {
  const endpoint = import.meta.env.VITE_MEDIA_UPLOAD_URL
  if (!endpoint) {
    throw new MediaUploadError(
      'Upload is not configured. Set VITE_MEDIA_UPLOAD_URL to your upload.php URL, or paste a direct link instead.',
    )
  }

  const body = new FormData()
  body.append('file', file)

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      body,
      credentials: 'omit',
      mode: 'cors',
    })
  } catch {
    throw new MediaUploadError('Network error while uploading. Check CORS on the server.')
  }

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new MediaUploadError(t || `Upload failed (${res.status})`)
  }

  const data = (await res.json()) as { url?: string; ok?: boolean; kind?: AnnouncementMedia['kind'] }
  const url = typeof data.url === 'string' ? data.url.trim() : ''
  if (!url) {
    throw new MediaUploadError('Server did not return a file URL.')
  }

  const kind = data.kind ?? inferKind(file)
  return { kind, url }
}

export function parseMediaUrlInput(raw: string): AnnouncementMedia | null {
  const url = raw.trim()
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    const path = u.pathname.toLowerCase()
    const video =
      path.endsWith('.mp4') ||
      path.endsWith('.webm') ||
      path.endsWith('.mov') ||
      path.endsWith('.m4v')
    return { kind: video ? 'video' : 'image', url }
  } catch {
    return null
  }
}
