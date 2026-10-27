export interface PageSeo {
  /** Document title; the layout appends " · Carimbo". */
  title: string
  description: string
  /** og:title / twitter:title when it should differ from `title` (e.g. "FALSO: …"). */
  socialTitle?: string
}

const OG_IMAGE_ALT =
  'Carimbo: um carimbo vermelho com a palavra FALSO e a frase "o que circulou, carimbado".'

/** Per-page title, description and sharing tags (docs/PLANO.md §2 #11). */
export function usePageSeo(input: MaybeRefOrGetter<PageSeo>) {
  const config = useRuntimeConfig()
  const requestUrl = useRequestURL()
  const origin = (config.public.siteUrl || requestUrl.origin).replace(/\/$/, '')
  // The site may live under a base path (GitHub Pages: /carimbo/).
  const ogImage = `${origin}${withAppBase(config.app.baseURL, 'og.png')}`
  const seo = computed(() => toValue(input))
  const social = computed(() => seo.value.socialTitle ?? seo.value.title)

  useSeoMeta({
    title: () => seo.value.title,
    description: () => seo.value.description,
    ogTitle: () => social.value,
    ogDescription: () => seo.value.description,
    ogType: 'website',
    ogSiteName: 'Carimbo',
    ogLocale: 'pt_BR',
    ogUrl: () => `${origin}${requestUrl.pathname}`,
    ogImage,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageType: 'image/png',
    ogImageAlt: OG_IMAGE_ALT,
    twitterCard: 'summary_large_image',
    twitterTitle: () => social.value,
    twitterDescription: () => seo.value.description,
    twitterImage: ogImage,
    twitterImageAlt: OG_IMAGE_ALT,
  })
}
