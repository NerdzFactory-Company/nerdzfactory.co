import { useEffect, useState } from 'react'
import { CheckCircle2, RotateCcw, Save } from 'lucide-react'
import { SITE_IMAGE_DEFS, type SiteImageKey } from '@/content/siteImageDefs'
import { useSiteImages } from '@/context/SiteImagesContext'
import { apiSaveSiteImages } from '@/lib/supabase/lmsApi'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ImageUploadField } from '@/components/admin/ImageUploadField'

type FormValues = Record<SiteImageKey, string>

function buildFormValues(images: FormValues): FormValues {
  return Object.fromEntries(SITE_IMAGE_DEFS.map((d) => [d.key, images[d.key]])) as FormValues
}

export function AdminMediaPage() {
  const { images, loaded, refresh } = useSiteImages()
  const [values, setValues] = useState<FormValues>(() => buildFormValues(images))
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loaded || hydrated) return
    setValues(buildFormValues(images))
    setHydrated(true)
  }, [loaded, hydrated, images])

  const setValue = (key: SiteImageKey, url: string) => {
    setSaved(false)
    setValues((prev) => ({ ...prev, [key]: url }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const entries: Record<string, string> = {}
      for (const def of SITE_IMAGE_DEFS) {
        const value = values[def.key].trim()
        // Empty or unchanged-from-default means "no override"
        entries[def.key] = value && value !== def.default ? value : ''
      }
      await apiSaveSiteImages(entries)
      await refresh()
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save images.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-w-0 max-w-3xl space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-bold text-fg">Site images</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          These images appear across the whole platform — logos, the sign-in pages, and the
          learner dashboard. Course thumbnails and hero banners are edited on each course under{' '}
          <span className="font-semibold text-fg">Courses</span>.
        </p>
      </Card>

      {SITE_IMAGE_DEFS.map((def) => {
        const isDefault = !values[def.key].trim() || values[def.key].trim() === def.default
        return (
          <Card key={def.key} className="space-y-3 p-5 sm:p-6">
            <ImageUploadField
              label={def.label}
              hint={def.hint}
              value={values[def.key]}
              onChange={(url) => setValue(def.key, url)}
              uploadPath={`site/${def.key}`}
            />
            {isDefault ? (
              <p className="text-xs text-muted/70">Using the built-in default image.</p>
            ) : (
              <button
                type="button"
                onClick={() => setValue(def.key, def.default)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to default
              </button>
            )}
          </Card>
        )
      })}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button onClick={() => void handleSave()} loading={saving} pill className="sm:!w-auto">
          <Save className="h-4 w-4" />
          Save all images
        </Button>
        {saved ? (
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
            <CheckCircle2 className="h-4 w-4" />
            Saved — changes are live for everyone.
          </p>
        ) : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </div>
  )
}
