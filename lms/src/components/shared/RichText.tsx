import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import { cn, isRichHtml } from '@/utils/helpers'

type RichTextProps = {
  content: string
  className?: string
}

/**
 * Renders admin-authored content. Rich HTML (from the admin editors) is
 * sanitized and styled; legacy plain text keeps its line breaks.
 */
export function RichText({ content, className }: RichTextProps) {
  const rich = isRichHtml(content)
  const html = useMemo(
    () =>
      rich
        ? DOMPurify.sanitize(content, {
            ALLOWED_TAGS: [
              'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
              'ul', 'ol', 'li', 'a', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre', 'span',
            ],
            ALLOWED_ATTR: ['href', 'target', 'rel'],
          })
        : '',
    [content, rich],
  )

  if (!content?.trim()) return null

  if (!rich) {
    return <div className={cn('nf-rich-text whitespace-pre-wrap', className)}>{content}</div>
  }

  return <div className={cn('nf-rich-text', className)} dangerouslySetInnerHTML={{ __html: html }} />
}
