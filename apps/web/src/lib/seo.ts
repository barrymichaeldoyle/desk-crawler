import { PLATFORM_ORIGIN, PLATFORM_NAME } from '@trmnl-games/platform'

export const SITE_ORIGIN = PLATFORM_ORIGIN
export const SITE_NAME = PLATFORM_NAME
/** Bump when the social cards are re-rendered: Discord and other unfurlers cache images by URL. */
export const OG_VERSION = 2
/** Desk Crawler's own social card, for its public pages. */
export const DESK_CRAWLER_OG = { path: `/games/desk-crawler/og.png?v=${OG_VERSION}`, alt: 'Desk Crawler: Pip the office warrior squares up to a Cable Serpent in the Server Room' }
export const SITE_DESCRIPTION = 'Games for your TRMNL e-ink display. Start with Desk Crawler, an office RPG that plays itself on your desk.'

/**
 * Per-route head tags. Child meta with the same name/property replaces the
 * root defaults; private and handoff pages pass `index: false`.
 */
export function seo({ title, description = SITE_DESCRIPTION, path, index = true, image }: { title?: string; description?: string; path?: string; index?: boolean; image?: { path: string; alt: string } }) {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME}: games for your e-ink display`
  return {
    meta: [
      { title: fullTitle },
      { name: 'description', content: description },
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: description },
      ...(path ? [{ property: 'og:url', content: `${SITE_ORIGIN}${path}` }] : []),
      ...(image ? [{ property: 'og:image', content: `${SITE_ORIGIN}${image.path}` }, { property: 'og:image:alt', content: image.alt }] : []),
      ...(index ? [] : [{ name: 'robots', content: 'noindex, nofollow' }]),
    ],
    links: path && index ? [{ rel: 'canonical', href: `${SITE_ORIGIN}${path}` }] : [],
  }
}
