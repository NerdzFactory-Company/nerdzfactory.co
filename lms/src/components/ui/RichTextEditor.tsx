import { useEffect, type ReactNode } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Link2,
  Link2Off,
  Undo2,
  Redo2,
  RemoveFormatting,
} from 'lucide-react'
import { cn, plainTextToHtml } from '@/utils/helpers'

type RichTextEditorProps = {
  label?: string
  hint?: string
  value: string
  onChange: (html: string) => void
  /** Rough visual height, matching the old textarea rows */
  minRows?: number
  disabled?: boolean
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep the editor focused
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors',
        active ? 'bg-accent/20 text-accent' : 'hover:bg-surface-2 hover:text-fg',
        disabled && 'opacity-30',
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-border/70" aria-hidden />
}

function Toolbar({ editor, disabled }: { editor: Editor; disabled?: boolean }) {
  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link address (https://…)', previous ?? 'https://')
    if (url === null) return
    if (!url.trim() || url.trim() === 'https://') {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  return (
    <div className="flex flex-nowrap items-center gap-0.5 overflow-x-auto scrollbar-thin rounded-t-xl border-b border-border/60 bg-surface-2/50 px-2 py-1.5">
      <ToolbarButton
        title="Bold"
        disabled={disabled}
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        disabled={disabled}
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Underline"
        disabled={disabled}
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Strikethrough"
        disabled={disabled}
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        title="Bulleted list"
        disabled={disabled}
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Numbered list"
        disabled={disabled}
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        title="Heading"
        disabled={disabled}
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Subheading"
        disabled={disabled}
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Quote"
        disabled={disabled}
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="Add link" disabled={disabled} active={editor.isActive('link')} onClick={setLink}>
        <Link2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Remove link"
        disabled={disabled || !editor.isActive('link')}
        onClick={() => editor.chain().focus().unsetLink().run()}
      >
        <Link2Off className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Clear formatting"
        disabled={disabled}
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
      >
        <RemoveFormatting className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        title="Undo"
        disabled={disabled || !editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Redo"
        disabled={disabled || !editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>
    </div>
  )
}

export function RichTextEditor({
  label,
  hint,
  value,
  onChange,
  minRows = 4,
  disabled = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
    ],
    content: plainTextToHtml(value),
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'nf-rich-text nf-rich-editor-area focus:outline-none',
        style: `min-height: ${minRows * 1.75}rem`,
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.isEmpty ? '' : e.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  // Hydrate when the saved value arrives after the editor was created
  // (e.g. opening an existing course). Skip if the change came from typing.
  useEffect(() => {
    if (!editor) return
    const incoming = plainTextToHtml(value)
    const current = editor.isEmpty ? '' : editor.getHTML()
    if (incoming === current || (!value && editor.isEmpty)) return
    if (editor.isFocused) return
    editor.commands.setContent(incoming, { emitUpdate: false })
  }, [editor, value])

  return (
    <div className="min-w-0 w-full">
      {label ? <label className="mb-2 block text-base font-semibold text-fg">{label}</label> : null}
      <div
        className={cn(
          'min-w-0 overflow-hidden rounded-xl border border-border bg-surface transition-shadow focus-within:ring-2 focus-within:ring-accent/40',
          disabled && 'opacity-60',
        )}
      >
        {editor ? <Toolbar editor={editor} disabled={disabled} /> : null}
        <div className="min-w-0">
          <EditorContent editor={editor} />
        </div>
      </div>
      {hint ? <p className="mt-1.5 text-sm text-muted">{hint}</p> : null}
    </div>
  )
}
