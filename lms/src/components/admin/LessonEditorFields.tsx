import { useRef, useState } from 'react'
import { ImageIcon, Loader2, Plus, Trash2, Upload, X } from 'lucide-react'
import type { Lesson, LessonResource } from '@/types'
import { apiUploadCourseImage, apiUploadLessonVideo } from '@/lib/supabase/lmsApi'
import { LazyImage } from '@/components/shared/LazyImage'
import { ReorderControls } from '@/components/admin/ReorderControls'
import {
  captureVideoFrameAtRatio,
  isDirectVideoUrl,
  videoThumbnailUrl,
} from '@/utils/helpers'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { RichTextEditor } from '@/components/ui/RichTextEditor'

/** Practical ceiling for direct uploads — Supabase Free plan caps files at 50 MB. */
const MAX_VIDEO_BYTES = 200 * 1024 * 1024

type LessonEditorFieldsProps = {
  lesson: Lesson
  index: number
  totalLessons?: number
  onChange: (patch: Partial<Lesson>) => void
  onRemove?: () => void
  canRemove: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
  onDragStart?: () => void
  onDragEnd?: () => void
  isDragging?: boolean
  /** Storage folder for uploaded videos, e.g. courses/my-course/lessons */
  videoUploadPath: string
}

function ensureList(items: string[] | undefined): string[] {
  return items?.length ? items : ['']
}

function ensureResources(items: LessonResource[] | undefined): LessonResource[] {
  return items?.length ? items : [{ label: '', url: '' }]
}

export function LessonEditorFields({
  lesson,
  index,
  totalLessons = 1,
  onChange,
  onRemove,
  canRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  isDragging,
  videoUploadPath,
}: LessonEditorFieldsProps) {
  const objectives = ensureList(lesson.objectives)
  const keyTakeaways = ensureList(lesson.keyTakeaways)
  const resources = ensureResources(lesson.resources)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [videoUploading, setVideoUploading] = useState(false)
  const [thumbCapturing, setThumbCapturing] = useState(false)
  const [videoError, setVideoError] = useState('')

  const previewUrl =
    videoThumbnailUrl(lesson.videoUrl, lesson.thumbnailUrl) || lesson.thumbnailUrl?.trim() || ''

  const captureAndUploadThumbnail = async (videoUrl: string) => {
    if (!isDirectVideoUrl(videoUrl)) return
    setThumbCapturing(true)
    try {
      const blob = await captureVideoFrameAtRatio(videoUrl, 0.5)
      const file = new File([blob], 'preview.jpg', { type: 'image/jpeg' })
      const thumbUrl = await apiUploadCourseImage(file, `${videoUploadPath}/previews`)
      onChange({ thumbnailUrl: thumbUrl })
    } catch {
      /* Preview capture is best-effort — admin can retry */
    } finally {
      setThumbCapturing(false)
    }
  }

  const handleVideoFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('video/')) {
      setVideoError('Please choose a video file (MP4 works best).')
      return
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setVideoError('Video is too large. Please keep uploads under 200 MB, or use YouTube / Google Drive for long videos.')
      return
    }
    setVideoError('')
    setVideoUploading(true)
    try {
      const url = await apiUploadLessonVideo(file, videoUploadPath)
      onChange({ videoUrl: url, thumbnailUrl: '' })
      await captureAndUploadThumbnail(url)
    } catch (e) {
      setVideoError(e instanceof Error ? e.message : 'Could not upload the video.')
    } finally {
      setVideoUploading(false)
      if (videoInputRef.current) videoInputRef.current.value = ''
    }
  }

  const updateList = (field: 'objectives' | 'keyTakeaways', idx: number, value: string) => {
    const list = field === 'objectives' ? [...objectives] : [...keyTakeaways]
    list[idx] = value
    onChange({ [field]: list })
  }

  const addListItem = (field: 'objectives' | 'keyTakeaways') => {
    const list = field === 'objectives' ? objectives : keyTakeaways
    onChange({ [field]: [...list, ''] })
  }

  const removeListItem = (field: 'objectives' | 'keyTakeaways', idx: number) => {
    const list = (field === 'objectives' ? objectives : keyTakeaways).filter((_, i) => i !== idx)
    onChange({ [field]: list.length ? list : [''] })
  }

  const updateResource = (idx: number, patch: Partial<LessonResource>) => {
    onChange({
      resources: resources.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    })
  }

  const addResource = () => {
    onChange({ resources: [...resources, { label: '', url: '' }] })
  }

  const removeResource = (idx: number) => {
    const next = resources.filter((_, i) => i !== idx)
    onChange({ resources: next.length ? next : [{ label: '', url: '' }] })
  }

  return (
    <div className="min-w-0 space-y-4 rounded-xl border border-border/60 bg-surface-2/30 p-3 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <span className="text-sm font-bold text-accent">Lesson {index + 1}</span>
        <div className="flex items-center justify-end gap-1 self-end sm:self-auto">
          {onMoveUp && onMoveDown ? (
            <ReorderControls
              label={`lesson ${index + 1}`}
              position={index}
              total={totalLessons}
              compact
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              isDragging={isDragging}
            />
          ) : null}
          {canRemove && onRemove ? (
            <button type="button" onClick={onRemove} className="rounded-md p-1.5 text-danger sm:rounded-lg sm:p-2" aria-label="Remove lesson">
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <Input
        label="Lesson title"
        value={lesson.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="e.g. Introduction to spreadsheets"
      />

      <RichTextEditor
        label="About this lesson"
        value={lesson.description}
        onChange={(description) => onChange({ description })}
        hint="Short overview — shown under the video"
        minRows={2}
      />

      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg sm:text-base">Lesson video</p>
            <p className="text-sm text-muted">
              Upload a video file, or paste a YouTube / Google Drive link below.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="!w-full shrink-0 sm:!w-auto"
            disabled={videoUploading}
            onClick={() => videoInputRef.current?.click()}
          >
            {videoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {videoUploading ? 'Uploading…' : 'Upload video'}
          </Button>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/ogg"
            className="hidden"
            onChange={(e) => void handleVideoFile(e.target.files?.[0])}
          />
        </div>

        {isDirectVideoUrl(lesson.videoUrl) ? (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-black">
            <video src={lesson.videoUrl} className="max-h-48 w-full" controls preload="metadata" />
          </div>
        ) : null}

        {previewUrl ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-fg">Video preview image</p>
            <div className="nf-image-preview max-h-40">
              <LazyImage
                src={previewUrl}
                alt=""
                priority
                wrapperClassName="block h-full w-full"
                className="h-full w-full object-cover"
              />
            </div>
            {isDirectVideoUrl(lesson.videoUrl) ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="!w-auto"
                loading={thumbCapturing}
                disabled={thumbCapturing}
                onClick={() => void captureAndUploadThumbnail(lesson.videoUrl)}
              >
                <ImageIcon className="h-4 w-4" />
                Recapture from middle of video
              </Button>
            ) : null}
          </div>
        ) : isDirectVideoUrl(lesson.videoUrl) ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="!w-auto"
            loading={thumbCapturing}
            disabled={thumbCapturing}
            onClick={() => void captureAndUploadThumbnail(lesson.videoUrl)}
          >
            <ImageIcon className="h-4 w-4" />
            Generate preview from middle of video
          </Button>
        ) : null}

        <Input
          label="Video link (uploaded file, YouTube, or Google Drive)"
          value={lesson.videoUrl}
          onChange={(e) => {
            const next = e.target.value
            onChange({
              videoUrl: next,
              thumbnailUrl: isDirectVideoUrl(next) ? lesson.thumbnailUrl : '',
            })
          }}
          placeholder="https://www.youtube.com/watch?v=... or https://drive.google.com/file/d/..."
          hint='For Google Drive: open the video, click Share, and set access to "Anyone with the link".'
        />

        {videoError ? <p className="text-sm text-danger">{videoError}</p> : null}
      </div>

      <Input
        label="Video length"
        value={lesson.duration}
        onChange={(e) => onChange({ duration: e.target.value })}
        placeholder="e.g. 5:30"
        hint="How long the video runs (for learners browsing the course)"
      />

      <RichTextEditor
        label="Before you watch"
        value={lesson.prerequisites ?? ''}
        onChange={(prerequisites) => onChange({ prerequisites })}
        hint="Optional — e.g. Complete lesson 1 first, or have a notebook ready"
        minRows={2}
      />

      <div>
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg sm:text-base">What learners will learn</p>
            <p className="text-sm text-muted">Bullet points for this video</p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="!w-auto shrink-0" onClick={() => addListItem('objectives')}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {objectives.map((item, idx) => (
            <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <RichTextEditor
                  value={item}
                  onChange={(value) => updateList('objectives', idx, value)}
                  minRows={1}
                />
              </div>
              {objectives.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeListItem('objectives', idx)}
                  className="shrink-0 self-end rounded-lg p-3 text-danger sm:self-center"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg sm:text-base">Key takeaways</p>
            <p className="text-sm text-muted">Main points to remember after watching</p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="!w-auto shrink-0" onClick={() => addListItem('keyTakeaways')}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {keyTakeaways.map((item, idx) => (
            <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <RichTextEditor
                  value={item}
                  onChange={(value) => updateList('keyTakeaways', idx, value)}
                  minRows={1}
                />
              </div>
              {keyTakeaways.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeListItem('keyTakeaways', idx)}
                  className="shrink-0 self-end rounded-lg p-3 text-danger sm:self-center"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg sm:text-base">Extra materials</p>
            <p className="text-sm text-muted">Worksheets, articles, or download links</p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="!w-auto shrink-0" onClick={addResource}>
            <Plus className="h-4 w-4" /> Add link
          </Button>
        </div>
        <div className="space-y-3">
          {resources.map((resource, idx) => (
            <div key={idx} className="grid min-w-0 grid-cols-1 gap-2 rounded-lg border border-border/50 bg-surface/50 p-3 lg:grid-cols-2">
              <Input
                label="Link name"
                value={resource.label}
                onChange={(e) => updateResource(idx, { label: e.target.value })}
                placeholder="e.g. Practice worksheet"
              />
              <Input
                label="Web address"
                value={resource.url}
                onChange={(e) => updateResource(idx, { url: e.target.value })}
                placeholder="https://…"
              />
              {resources.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeResource(idx)}
                  className="text-sm font-medium text-danger sm:col-span-2"
                >
                  Remove link
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
