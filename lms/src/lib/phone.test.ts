import { describe, expect, it } from 'vitest'
import { isValidPhone, normalizePhone, phoneLookupVariants } from '@/lib/phone'
import {
  driveFileId,
  isDirectVideoUrl,
  isRichHtml,
  isRichTextEmpty,
  plainTextToHtml,
  richTextToPlain,
  videoEmbedUrl,
  videoThumbnailUrl,
  ytEmbedUrl,
} from '@/utils/helpers'

describe('normalizePhone', () => {
  it('normalizes Nigerian local numbers', () => {
    expect(normalizePhone('08012345678')).toBe('+2348012345678')
  })

  it('normalizes +234 format', () => {
    expect(normalizePhone('+2348012345678')).toBe('+2348012345678')
  })

  it('rejects invalid numbers', () => {
    expect(normalizePhone('123')).toBeNull()
  })
})

describe('isValidPhone', () => {
  it('matches normalizePhone', () => {
    expect(isValidPhone('08012345678')).toBe(true)
    expect(isValidPhone('bad')).toBe(false)
  })
})

describe('phoneLookupVariants', () => {
  it('returns multiple formats for lookup', () => {
    const variants = phoneLookupVariants('08012345678')
    expect(variants).toContain('+2348012345678')
    expect(variants).toContain('08012345678')
  })
})

describe('ytEmbedUrl', () => {
  it('converts watch URLs to privacy-enhanced embed', () => {
    const url = ytEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(url).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(url).toContain('modestbranding=1')
  })

  it('returns empty for blank input', () => {
    expect(ytEmbedUrl('')).toBe('')
  })
})

describe('Google Drive video support', () => {
  const shareLink = 'https://drive.google.com/file/d/1AbCdEfGh_iJkLmN/view?usp=sharing'

  it('extracts the file id from share links', () => {
    expect(driveFileId(shareLink)).toBe('1AbCdEfGh_iJkLmN')
    expect(driveFileId('https://drive.google.com/open?id=XYZ123')).toBe('XYZ123')
    expect(driveFileId('https://www.youtube.com/watch?v=abc')).toBe('')
  })

  it('builds a Drive preview embed', () => {
    expect(videoEmbedUrl(shareLink)).toBe(
      'https://drive.google.com/file/d/1AbCdEfGh_iJkLmN/preview',
    )
  })

  it('still routes YouTube links through the YouTube embed', () => {
    expect(videoEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toContain(
      'youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
  })

  it('builds a Drive thumbnail', () => {
    expect(videoThumbnailUrl(shareLink)).toBe(
      'https://drive.google.com/thumbnail?id=1AbCdEfGh_iJkLmN&sz=w1280',
    )
  })

  it('uses YouTube mid-frame thumbnail (index 2)', () => {
    expect(videoThumbnailUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/2.jpg',
    )
  })

  it('prefers stored lesson thumbnail over remote', () => {
    expect(
      videoThumbnailUrl('https://www.youtube.com/watch?v=abc', 'https://cdn.example.com/thumb.jpg'),
    ).toBe('https://cdn.example.com/thumb.jpg')
  })
})

describe('rich text helpers', () => {
  it('detects HTML vs plain text', () => {
    expect(isRichHtml('<p>Hello</p>')).toBe(true)
    expect(isRichHtml('plain text')).toBe(false)
  })

  it('converts plain text to HTML paragraphs', () => {
    expect(plainTextToHtml('Line one\n\nLine two')).toContain('<p>')
  })

  it('strips HTML to plain text', () => {
    expect(richTextToPlain('<p>Hello <strong>world</strong></p>')).toBe('Hello world')
    expect(richTextToPlain('<ul><li>One</li><li>Two</li></ul>')).toContain('One')
  })

  it('detects empty rich text', () => {
    expect(isRichTextEmpty('')).toBe(true)
    expect(isRichTextEmpty('<p></p>')).toBe(true)
    expect(isRichTextEmpty('<p><br></p>')).toBe(true)
    expect(isRichTextEmpty('<p>Hello</p>')).toBe(false)
  })
})

describe('uploaded (direct file) video support', () => {
  const uploaded =
    'https://ifkviqlzhdsaovozlbqd.supabase.co/storage/v1/object/public/lms-media/courses/x/lessons/1.mp4'

  it('detects storage uploads and plain file links', () => {
    expect(isDirectVideoUrl(uploaded)).toBe(true)
    expect(isDirectVideoUrl('https://cdn.example.com/video.mp4?x=1')).toBe(true)
    expect(isDirectVideoUrl('https://www.youtube.com/watch?v=abc')).toBe(false)
    expect(isDirectVideoUrl('https://drive.google.com/file/d/XYZ/view')).toBe(false)
    expect(isDirectVideoUrl('')).toBe(false)
  })

  it('plays direct files as-is instead of an embed', () => {
    expect(videoEmbedUrl(uploaded)).toBe(uploaded)
  })

  it('has no remote thumbnail for direct files', () => {
    expect(videoThumbnailUrl(uploaded)).toBe('')
  })
})
