import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { cn } from '@/utils/helpers'

type ReorderControlsProps = {
  label: string
  position: number
  total: number
  onMoveUp: () => void
  onMoveDown: () => void
  draggable?: boolean
  compact?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
  isDragging?: boolean
  className?: string
}

/** Up/down + drag handle for reordering lists in admin forms. */
export function ReorderControls({
  label,
  position,
  total,
  onMoveUp,
  onMoveDown,
  draggable = true,
  compact = false,
  onDragStart,
  onDragEnd,
  isDragging,
  className,
}: ReorderControlsProps) {
  const atTop = position <= 0
  const atBottom = position >= total - 1
  const btn = compact ? 'rounded-md p-1.5' : 'rounded-lg p-2'
  const icon = compact ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <div className={cn('flex shrink-0 flex-col items-center gap-0.5 sm:flex-row', className)}>
      {draggable ? (
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', String(position))
            onDragStart?.()
          }}
          onDragEnd={() => onDragEnd?.()}
          className={cn(
            'cursor-grab text-muted transition-colors hover:bg-surface-2 hover:text-fg active:cursor-grabbing',
            btn,
            isDragging && 'opacity-40',
          )}
          aria-label={`Drag to reorder ${label}`}
        >
          <GripVertical className={icon} />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onMoveUp}
        disabled={atTop}
        className={cn('text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-30', btn)}
        aria-label={`Move ${label} up`}
      >
        <ChevronUp className={icon} />
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={atBottom}
        className={cn('text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-30', btn)}
        aria-label={`Move ${label} down`}
      >
        <ChevronDown className={icon} />
      </button>
    </div>
  )
}

type ReorderDropZoneProps = {
  index: number
  onDropAt: (index: number) => void
  active: boolean
}

/** Invisible drop target between reorderable items. */
export function ReorderDropZone({ index, onDropAt, active }: ReorderDropZoneProps) {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDropAt(index)
      }}
      className={cn(
        'h-1 rounded-full transition-all',
        active ? 'my-1 h-2 bg-accent/40' : 'bg-transparent',
      )}
      aria-hidden
    />
  )
}
