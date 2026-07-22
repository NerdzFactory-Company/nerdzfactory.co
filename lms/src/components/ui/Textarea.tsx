import type { ChangeEvent, TextareaHTMLAttributes } from 'react'
import { RichTextEditor } from '@/components/ui/RichTextEditor'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

/** Multi-line field with rich-text toolbar (bold, lists, links, etc.). */
export function Textarea({ label, hint, error, value, onChange, rows = 4, disabled, ...rest }: TextareaProps) {
  const stringValue = typeof value === 'string' ? value : ''

  return (
    <div className="w-full">
      <RichTextEditor
        label={label}
        hint={hint}
        value={stringValue}
        onChange={(html) => {
          onChange?.({
            target: { value: html },
            currentTarget: { value: html },
          } as ChangeEvent<HTMLTextAreaElement>)
        }}
        minRows={rows}
        disabled={disabled}
      />
      {error ? <p className="mt-2 text-sm font-medium text-danger">{error}</p> : null}
      {rest.name ? <input type="hidden" name={rest.name} value={stringValue} readOnly /> : null}
    </div>
  )
}
