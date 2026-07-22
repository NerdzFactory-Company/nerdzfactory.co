import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  isUsableSiteImageOverride,
  SITE_IMAGE_DEFS,
  SITE_IMAGE_DEFAULTS,
  type SiteImageKey,
} from '@/content/siteImageDefs'
import { apiFetchSiteImages } from '@/lib/supabase/lmsApi'

type SiteImagesContextValue = {
  /** Resolved image for each key: admin override if set, otherwise the built-in default. */
  images: Record<SiteImageKey, string>
  /** Raw overrides only (empty string = no override) — used by the admin Media form. */
  overrides: Partial<Record<SiteImageKey, string>>
  loaded: boolean
  refresh: () => Promise<void>
}

const SiteImagesContext = createContext<SiteImagesContextValue>({
  images: SITE_IMAGE_DEFAULTS,
  overrides: {},
  loaded: false,
  refresh: async () => {},
})

export function SiteImagesProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Partial<Record<SiteImageKey, string>>>({})
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const map = await apiFetchSiteImages()
      setOverrides(map as Partial<Record<SiteImageKey, string>>)
    } catch {
      // Defaults still render; overrides are cosmetic.
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const images = useMemo(() => {
    const resolved = { ...SITE_IMAGE_DEFAULTS }
    for (const def of SITE_IMAGE_DEFS) {
      const override = overrides[def.key]
      if (override && isUsableSiteImageOverride(def.key, override)) resolved[def.key] = override.trim()
    }
    return resolved
  }, [overrides])

  useEffect(() => {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (favicon && favicon.href !== images.favicon) favicon.href = images.favicon
  }, [images.favicon])

  const value = useMemo(
    () => ({ images, overrides, loaded, refresh }),
    [images, overrides, loaded, refresh],
  )

  return <SiteImagesContext.Provider value={value}>{children}</SiteImagesContext.Provider>
}

// Hook export alongside provider — standard context pattern.
// eslint-disable-next-line react-refresh/only-export-components
export function useSiteImages() {
  return useContext(SiteImagesContext)
}
