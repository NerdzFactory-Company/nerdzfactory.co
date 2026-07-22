import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { apiUploadCourseImage } from '@/lib/supabase/lmsApi'
import { MAX_IMAGE_BYTES, MAX_IMAGE_MB } from '@/lib/uploadLimits'
import { LazyImage } from '@/components/shared/LazyImage'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type ImageUploadFieldProps = {
  label: string
  hint?: string
  value: string
  onChange: (url: string) => void
  uploadPath: string
  optional?: boolean
}

export function ImageUploadField({
  label,
  hint,
  value,
  onChange,
  uploadPath,
  optional,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPG, PNG, or WebP).')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`Image must be ${MAX_IMAGE_MB} MB or smaller.`)
      return
    }
    setError('')
    setUploading(true)
    try {
      const url = await apiUploadCourseImage(file, uploadPath)
      onChange(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload image.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const clearImage = () => {
    setError('')
    onChange('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <p className="text-base font-semibold text-fg">
            {label}
            {optional ? <span className="ml-1 text-sm font-normal text-muted">(optional)</span> : null}
          </p>
          {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="!w-auto"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {uploading ? 'Uploading…' : 'Upload image'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>

      {value ? (
        <div className="nf-image-preview">
          <LazyImage
            src={value}
            alt=""
            priority
            wrapperClassName="block h-full w-full"
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={clearImage}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-surface/95 text-muted shadow-sm transition-colors hover:bg-surface-2 hover:text-fg"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : optional ? (
        <p className="rounded-lg border border-dashed border-border/70 bg-surface-2/30 px-4 py-3 text-sm text-muted">
          No image uploaded. We will use a preview from your first video instead.
        </p>
      ) : null}

      <Input
        label="Or paste an image link"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://…"
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  )
}
