export const SITE_ORIGIN = 'https://desk-crawler.grandprixpicks.com'
export const SITE_NAME = 'Desk Crawler'
export const SITE_DESCRIPTION = 'An office RPG that plays itself on your TRMNL e-ink display. Free, passive and calm.'

/**
 * Per-route head tags. Child meta with the same name/property replaces the
 * root defaults; private and handoff pages pass `index: false`.
 */
export function seo({ title, description = SITE_DESCRIPTION, path, index = true }: { title?: string; description?: string; path?: string; index?: boolean }) {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME}: an office RPG for TRMNL`
  return {
    meta: [
      { title: fullTitle },
      { name: 'description', content: description },
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: description },
      ...(path ? [{ property: 'og:url', content: `${SITE_ORIGIN}${path}` }] : []),
      ...(index ? [] : [{ name: 'robots', content: 'noindex, nofollow' }]),
    ],
    links: path && index ? [{ rel: 'canonical', href: `${SITE_ORIGIN}${path}` }] : [],
  }
}
