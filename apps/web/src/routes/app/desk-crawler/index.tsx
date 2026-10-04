import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useRef } from 'react'
import { api } from '@trmnl-games/backend/api'
import { seo } from '../../../lib/seo'
import { artUrl, useIntent } from '../../../lib/intent'
import { Button, ErrorNote, Meter } from '../../../lib/ui'
import { preload } from '../../../lib/preload'
import { ReturnRecap } from './-recap'
import { DevicePreview } from './-devicePreview'
import { Pulse } from './-pulse'
import { AdventureLog } from './-log'
import { Records } from './-records'

export const Route = createFileRoute('/app/desk-crawler/')({
  head: () => seo({ title: 'Hero', index: false }),
  loader: ({ context }) =>
    preload(context, convexQuery(api.heroes.mine, {}), convexQuery(api.heroes.returnSummary, {}), convexQuery(api.leaderboard.view, {})),
  component: HeroHome,
})

type Biome = { id: string; name: string; unlocked: boolean; unlockLevel: number }

/**
 * Desk and feed: the TRMNL screen anchors the page (pinned left on wide
 * screens); the feed beside it tells how the hero got there and offers the
 * few decisions the game asks for.
 */
function HeroHome() {
  const { data: hero } = useQuery(convexQuery(api.heroes.mine, {}))
  if (!hero) return <p role="status" className="text-stone-600 dark:text-stone-400">Loading your hero…</p>
  const biomeName = hero.biomes.find((b: Biome) => b.id === hero.biomeId)?.name ?? ''
  const targetName = hero.biomes.find((b: Biome) => b.id === hero.targetBiomeId)?.name ?? ''

  return (
    <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="flex flex-col lg:sticky lg:top-16 lg:self-start">
        <h1 className="sr-only">{hero.name}</h1>
        <DevicePreview sceneUrl={artUrl(hero.scenePath)} heroName={hero.name} />
        <div className="mt-4">
          <Pulse hero={{ ...hero, biomeName, targetName }} />
        </div>
      </div>

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <ReturnRecap />
          <LiveGain hero={hero} />
        </div>
        <HeroSheet hero={hero} biomeName={biomeName} />
        <AdventureLog />
        <Records counters={hero.counters} lifetimeXp={hero.lifetimeXp} />
      </div>
    </div>
  )
}

/**
 * The recap above stays frozen for the visit (D25); this line counts what
 * arrives while the page is open, from the live hero subscription.
 */
function LiveGain({ hero }: { hero: { lifetimeXp: number; level: number; counters: { combatWins: number; goldEarned: number; itemsFound: number; deaths: number } } }) {
  const start = useRef(hero)
  const gained = (
    [
      ['XP', hero.lifetimeXp - start.current.lifetimeXp],
      ['level', hero.level - start.current.level],
      ['fight won', hero.counters.combatWins - start.current.counters.combatWins],
      ['gold', hero.counters.goldEarned - start.current.counters.goldEarned],
      ['item found', hero.counters.itemsFound - start.current.counters.itemsFound],
      ['knockout', hero.counters.deaths - start.current.counters.deaths],
    ] as const
  ).filter(([, value]) => value > 0)
  if (gained.length === 0) return null
  const label = (unit: string, value: number) => (unit === 'XP' || unit === 'gold' || value === 1 ? unit : unit.replace(/^(\w+)/, '$1s'))
  return (
    <p role="status" className="border-y border-stone-900 py-2 font-semibold tabular-nums dark:border-stone-300">
      While you've been here: {gained.map(([unit, value]) => `+${value.toLocaleString()} ${label(unit, value)}`).join(', ')}
    </p>
  )
}

// heroes.mine is validated as v.any(), so its shape is read structurally here.
type HeroView = {
  name: string
  level: number
  status: string
  hp: number
  maxHp: number
  xp: number
  xpToNext: number
  attack: number
  defense: number
  gold: number
  biomeId: string
  targetBiomeId: string | null
  biomes: Biome[]
}

function HeroSheet({ hero, biomeName }: { hero: HeroView; biomeName: string }) {
  const travel = useIntent(api.heroes.changeBiome)
  const potion = useIntent(api.inventory.usePotion)
  const pause = useIntent(api.heroes.pause)
  const resume = useIntent(api.heroes.resume)
  const canAct = hero.status === 'exploring' || hero.status === 'resting'

  return (
    <section aria-labelledby="hero-title" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id="hero-title" className="font-display text-4xl font-bold">
          {hero.name}
        </h2>
        <p className="text-stone-600 dark:text-stone-400">
          Level {hero.level} Warrior · {biomeName}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Meter label="HP" value={hero.hp} max={hero.maxHp} />
        <Meter label="XP" value={hero.xp} max={hero.xpToNext} />
      </div>

      <dl className="flex flex-wrap gap-x-8 gap-y-2">
        {(
          [
            ['Attack', hero.attack],
            ['Defense', hero.defense],
            ['Gold', hero.gold],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-2">
            <dt className="caps text-sm text-stone-600 dark:text-stone-400">{label}</dt>
            <dd className="text-xl font-bold tabular-nums">{value.toLocaleString()}</dd>
          </div>
        ))}
      </dl>
      <p className="-mt-3 text-xs text-stone-600 dark:text-stone-400">Gold will be spendable once the merchant arrives in a later update.</p>

      {canAct || hero.status === 'paused' || hero.status === 'sleeping' ? (
        <div className="flex flex-wrap gap-2">
          {hero.status === 'sleeping' ? (
            <Link to="/app/desk-crawler/inventory" className="inline-flex min-h-11 items-center bg-stone-900 px-4 font-semibold text-white dark:bg-stone-100 dark:text-stone-900">
              Open bag
            </Link>
          ) : null}
          {hero.status === 'paused' ? (
            <Button disabled={resume.pending} onClick={() => resume.run({})}>
              Resume adventures
            </Button>
          ) : null}
          {canAct ? (
            <Button variant="secondary" disabled={potion.pending || hero.hp >= hero.maxHp} onClick={() => potion.run({})}>
              Drink potion
            </Button>
          ) : null}
          {canAct ? (
            <Button variant="secondary" disabled={pause.pending} onClick={() => pause.run({})}>
              Pause adventures
            </Button>
          ) : null}
        </div>
      ) : null}
      <ErrorNote message={potion.error ?? pause.error ?? resume.error} />

      <div>
        <h3 className="font-display text-lg font-semibold">Where to explore</h3>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">Travel takes one adventure. Harder areas give more XP and better gear, and hit harder.</p>
        <ul className="mt-2 border-t border-stone-900 dark:border-stone-300">
          {hero.biomes.map((biome) => (
            <li key={biome.id} className="flex min-h-12 items-center justify-between gap-3 border-b border-stone-300 py-1 dark:border-stone-700">
              <span className={biome.unlocked ? '' : 'text-stone-500'}>
                <span className="font-semibold">{biome.name}</span>
                {biome.id === hero.biomeId ? <span className="ml-2 text-sm text-stone-600 dark:text-stone-400">You are here</span> : null}
                {biome.id === hero.targetBiomeId ? <span className="ml-2 text-sm text-stone-600 dark:text-stone-400">On the way</span> : null}
                {!biome.unlocked ? <span className="ml-2 text-sm">Unlocks at level {biome.unlockLevel}</span> : null}
              </span>
              {biome.unlocked && biome.id !== hero.biomeId && biome.id !== hero.targetBiomeId ? (
                <Button variant="secondary" disabled={!canAct || travel.pending} onClick={() => travel.run({ biomeId: biome.id })}>
                  Travel
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        {!canAct && hero.status !== 'travelling' ? (
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            {hero.status === 'paused' ? 'Resume adventures to travel.' : hero.status === 'sleeping' ? 'Make room in your bag to travel.' : hero.status === 'dead' ? 'Travel opens again once your hero is back on their feet.' : null}
          </p>
        ) : null}
        <ErrorNote message={travel.error} />
      </div>
    </section>
  )
}
