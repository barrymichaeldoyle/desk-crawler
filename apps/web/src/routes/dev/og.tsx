import { createFileRoute, notFound } from '@tanstack/react-router'
import { SampleScreen } from '../../lib/sampleScreen'

const CARDS = {
  platform: { mark: '/favicon.svg', title: 'TRMNL Games', tagline: 'Games for your TRMNL e-ink display. Starting with Desk Crawler.' },
  'desk-crawler': { mark: '/games/desk-crawler/icon-192.png', title: 'Desk Crawler', tagline: 'An office RPG that plays itself on your TRMNL.' },
} as const
type Card = keyof typeof CARDS

/**
 * Dev-only social cards (1200x630). `node tools/art/og.mjs` screenshots `#og-card` into
 * public/og.png and public/games/desk-crawler/og.png, so the cards use the site's own fonts,
 * painted scene and HUD rather than a separate drawing.
 */
export const Route = createFileRoute('/dev/og')({
  validateSearch: (search: Record<string, unknown>): { card: Card } => ({ card: search.card === 'desk-crawler' ? 'desk-crawler' : 'platform' }),
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  component: OgCard,
})

function OgCard() {
  const card = CARDS[Route.useSearch().card]
  return (
    <div id="og-card" className="flex h-[630px] w-[1200px] flex-col items-center justify-center gap-9 bg-ground">
      <div className="flex items-center gap-7">
        <img src={card.mark} alt="" width={112} height={112} className="size-28 [image-rendering:pixelated]" />
        <div className="flex flex-col gap-2">
          <p className="font-display text-[5.5rem] leading-none font-bold text-gold-ink">{card.title}</p>
          <p className="text-[1.75rem] leading-tight text-ink">{card.tagline}</p>
        </div>
      </div>
      {/* 152px stage at exactly 7x plus the 4px frame, so every art pixel stays square. */}
      <SampleScreen className="w-[1072px]" />
    </div>
  )
}
