import { PLATFORM_ORIGIN, PLATFORM_NAME } from '@trmnl-games/platform'

export const SITE_ORIGIN = PLATFORM_ORIGIN
export const SITE_NAME = PLATFORM_NAME
/** Bump when the social cards are re-rendered: Discord and other unfurlers cache images by URL. */
export const OG_VERSION = 2
/** Desk Crawler's own social card, for its public pages. */
export const DESK_CRAWLER_OG = { path: `/games/desk-crawler/og.png?v=${OG_VERSION}`, alt: 'Desk Crawler: Pip the office warrior squares up to a Cable Serpent in the Server Room' }
export const SITE_DESCRIPTION = 'Games for your TRMNL e-ink display. Start with Desk Crawler, an office RPG that plays itself on your desk.'

/** schema.org description of the site, for the home page's structured data. */
export const SITE_JSON_LD = { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: `${SITE_ORIGIN}/`, description: SITE_DESCRIPTION }

/** schema.org description of Desk Crawler, for its game page's structured data. */
export const DESK_CRAWLER_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  name: 'Desk Crawler',
  url: `${SITE_ORIGIN}/games/desk-crawler`,
  description: 'An office RPG that plays itself on your TRMNL e-ink display. Every fifteen minutes your hero fights, finds or falls, and the screen on your desk shows what happened.',
  image: `${SITE_ORIGIN}${DESK_CRAWLER_OG.path}`,
  genre: ['Role-playing', 'Idle'],
  gamePlatform: 'TRMNL e-ink display',
  applicationCategory: 'Game',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
  author: { '@type': 'Person', name: 'Barry Michael Doyle', url: 'https://barrymichaeldoyle.com' },
}

/**
 * Per-route head tags. Child meta with the same name/property replaces the
 * root defaults; private and handoff pages pass `index: false`.
 */
export function seo({ title, description = SITE_DESCRIPTION, path, index = true, image, jsonLd }: { title?: string; description?: string; path?: string; index?: boolean; image?: { path: string; alt: string }; jsonLd?: object }) {
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
    // `<` escaped so page text can never close the script element.
    scripts: jsonLd ? [{ type: 'application/ld+json', children: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }] : [],
  }
}
