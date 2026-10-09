import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { useMutation } from 'convex/react'
import { ConvexError } from 'convex/values'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '@trmnl-games/backend/api'
import { DESK_KEEPSAKES, keepsakeShelf, keepsakeWeek, LETTER_CODES_UNTIL } from '@trmnl-games/desk-crawler/content/keepsakes'
import { errorMessage } from '../../../lib/intent'
import { useOnline } from '../../../lib/network'
import { Submission } from '../../../lib/submission'
import { ActionFeedback, BUTTON_SECONDARY, Button, LINK_BUTTON } from '../../../lib/ui'
import { Glyph } from '../../../lib/glyphs'

export function KeepsakeIcon({ pixels }: { pixels: readonly string[] }) {
  const path = pixels.flatMap((row, y) => [...row.matchAll(/#+/g)].map((run) => `M${run.index} ${y}h${run[0].length}v1h-${run[0].length}z`)).join('')
  return <svg viewBox="0 0 8 8" width="32" height="32" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true" className="shrink-0"><path d={path} /></svg>
}

/**
 * The weekly claim: the owner's collection plus the code form's state, shared
 * by the settings shelf and the home page's callout so both behave the same.
 */
function useKeepsakeClaim() {
  const { data: collection } = useQuery(convexQuery(api.keepsakes.mine, {}))
  const mutate = useMutation(api.keepsakes.claim)
  const online = useOnline()
  const submission = useRef(new Submission())
  const inFlight = useRef(false)
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [earned, setEarned] = useState<(typeof DESK_KEEPSAKES)[number] | null>(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const collectedThisWeek = collection?.lastClaimWeek != null && collection.lastClaimWeek >= keepsakeWeek(now)
  const next = DESK_KEEPSAKES[(collection?.totalCollected ?? 0) % DESK_KEEPSAKES.length]!

  function edit(value: string) { setCode(value); setError(null); setMessage(null) }

  async function claim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return
    setError(null)
    setMessage(null)
    if (!online) { setError('You are offline. Reconnect, then try again.'); return }
    const normalized = code.trim().toUpperCase().replace(/[\s-]/g, '')
    const letterCode = Date.now() < LETTER_CODES_UNTIL && /^[A-HJ-NP-Z2-9]{8}$/.test(normalized)
    if (!/^\d{6}$/.test(normalized) && !letterCode) { setError('Enter the six-digit code shown beside “Keepsake” on your TRMNL.'); return }
    inFlight.current = true
    setPending(true)
    try {
      await submission.current.run({ code: normalized }, async (input) => {
        const result = await mutate(input)
        if (result.outcome === 'invalid_code') setError('That code doesn’t match your TRMNL connection. Check the digits on your screen, or wait for its next refresh.')
        else if (result.outcome === 'already_claimed') setMessage('This week’s keepsake is already on your shelf. The next code arrives next week.')
        else {
          const item = DESK_KEEPSAKES[(result.totalCollected - 1) % DESK_KEEPSAKES.length]!
          setEarned(item)
          setMessage(`${item.name} collected.`)
          setCode('')
        }
      }, (caught) => caught instanceof ConvexError)
    } catch (caught) { setError(errorMessage(caught)) }
    finally { inFlight.current = false; setPending(false) }
  }

  return { collection, collectedThisWeek, next, code, edit, claim, pending, error, message, earned }
}

type KeepsakeClaim = ReturnType<typeof useKeepsakeClaim>

function KeepsakeCodeForm({ form, inputId }: { form: KeepsakeClaim; inputId: string }) {
  const connected = form.collection?.connected ?? false
  return <form onSubmit={form.claim} className="flex flex-wrap items-end gap-3">
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-semibold">Code from your TRMNL</label>
      <input id={inputId} type="text" inputMode="numeric" value={form.code} onChange={(event) => form.edit(event.target.value)} placeholder="123 456" maxLength={10} autoComplete="one-time-code" spellCheck={false} disabled={form.pending || !connected} aria-describedby={`${inputId}-help`} aria-invalid={form.error ? true : undefined} className="min-h-11 w-48 border-2 border-edge bg-ground px-3 text-base tabular-nums tracking-widest" />
    </div>
    <Button type="submit" pending={form.pending} busyLabel="Collecting…" disabled={!connected || !form.code.trim()}>Collect keepsake</Button>
  </form>
}

/**
 * The home page's nudge while this week's keepsake is unclaimed: the design
 * waiting for the owner, a pointer to the code on their TRMNL and the claim
 * form itself, so the trip to the device pays off without a detour to
 * Settings. Hidden when there is nothing to collect or no connection to show
 * a code; stays to confirm a claim made from it until the next visit.
 */
export function KeepsakeCallout() {
  const form = useKeepsakeClaim()
  const { collection, next, earned } = form
  // Closed by default on every screen: the game screen stays in the first viewport and the code is two taps away.
  const [open, setOpen] = useState(false)
  if (!collection?.connected) return null
  if (form.collectedThisWeek && !earned) return null
  const shown = earned ?? next
  return <section aria-labelledby="keepsake-callout-title" className="flex min-w-0 flex-col border-[3px] border-night bg-panel outline-4 outline-gold">
    <div className="flex items-center gap-3 p-3 sm:gap-4 sm:px-4">
      <div className="grid size-12 shrink-0 place-items-center border-[3px] border-night bg-night text-gold-ink [&>svg]:size-8">
        <KeepsakeIcon pixels={shown.pixels} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="hud text-hud-sm whitespace-nowrap text-gold-ink">{earned ? 'Collected' : 'This week'}</p>
        <h2 id="keepsake-callout-title" className="mt-0.5 font-display text-lg leading-tight font-bold sm:text-2xl">{earned ? `${earned.name} is on your shelf` : 'Keepsake code ready'}</h2>
      </div>
      {earned
        ? <Link to="/app/desk-crawler/settings" hash="desk-keepsakes" className={`${LINK_BUTTON} ${BUTTON_SECONDARY} shrink-0 whitespace-nowrap`}>Shelf</Link>
        : <Button allowOffline variant={open ? 'secondary' : 'primary'} className="shrink-0 whitespace-nowrap" aria-expanded={open} aria-controls="keepsake-callout-form" onClick={() => setOpen((value) => !value)}>{open ? 'Later' : 'Enter code'}</Button>}
    </div>
    {open && !earned ? (
      <div id="keepsake-callout-form" className="flex flex-col gap-3 border-t-[3px] border-night p-3 sm:px-4">
        <p className="max-w-prose text-sm">Glance at your TRMNL for the six-digit code beside “Keepsake”, then enter it here to add <strong>{next.name}</strong> to your shelf. {next.description}</p>
        <KeepsakeCodeForm form={form} inputId="keepsake-callout-code" />
        <p id="keepsake-callout-code-help" className="text-sm text-muted">Only your TRMNL shows the code. The preview on this site leaves it out.</p>
        <ActionFeedback error={form.error} message={form.message} />
      </div>
    ) : null}
  </section>
}

export function DeskKeepsakes() {
  const form = useKeepsakeClaim()
  const { collection, collectedThisWeek, next, error, message } = form

  return <section id="desk-keepsakes" aria-labelledby="keepsakes-title" className="window min-w-0 scroll-mt-20 px-4 pt-3 pb-4 sm:px-5">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="keepsakes-title" className="flex items-center gap-3 font-display text-2xl font-bold"><Glyph name="keepsake" size={24} className="text-gold-ink" />Desk keepsakes</h2>
      {collection ? <p className="text-sm tabular-nums">{collection.totalCollected.toLocaleString()} collected</p> : null}
    </div>
    <p className="mt-3 max-w-prose text-sm text-muted">A souvenir for keeping Desk Crawler on your desk. Once a week your TRMNL shows a keepsake code. Enter it here to add the design to your shelf.</p>
    {!collection ? <p role="status" className="mt-4 text-sm">Loading your collection…</p> : <>
      <div className="my-5 flex items-center gap-4">
        <KeepsakeIcon pixels={next.pixels} />
        <div><p className="font-semibold">{collectedThisWeek ? 'Coming next: ' : 'Next keepsake: '}{next.name}</p><p className="mt-1 text-sm text-muted">{next.description}</p></div>
      </div>
      {collectedThisWeek ? <p className="text-sm font-semibold">Collected this week. {collection.nextAvailableAt ? `The next code arrives ${new Date(collection.nextAvailableAt).toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' })}.` : 'The next code arrives next week.'}</p> : <KeepsakeCodeForm form={form} inputId="keepsake-code" />}
      <p id="keepsake-code-help" className="mt-3 max-w-prose text-sm text-muted">{collection.connected ? 'The code sits beside “Keepsake” on your TRMNL screen. The preview on this site leaves it out.' : 'Reconnect the Desk Crawler plugin in TRMNL to receive keepsake codes.'}</p>
      <ActionFeedback error={error} message={message} />
      <ul aria-label="Your keepsake shelf" className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 min-[480px]:grid-cols-2 sm:grid-cols-3 sm:gap-y-5">
        {/* Collected designs sit in a solid night tile in gold; the rest are dark silhouettes in a dashed edge, still to earn. */}
        {keepsakeShelf(collection.totalCollected).map((item) => <li key={item.id} className={`flex items-center gap-3 ${item.count ? '' : 'text-muted'}`}>
          <span aria-hidden="true" className={`grid size-12 shrink-0 place-items-center border-[3px] bg-night ${item.count ? 'border-night text-gold-ink' : 'border-dashed border-faint text-raised'}`}><KeepsakeIcon pixels={item.pixels} /></span>
          <div className="min-w-0"><p className="text-sm font-semibold">{item.name}</p><p className="mt-0.5 text-sm tabular-nums">{item.count ? `${item.count.toLocaleString()} collected` : 'Not collected yet'}</p></div>
        </li>)}
      </ul>
      <p className="mt-5 max-w-prose text-sm text-muted">Keepsakes are for your shelf only. Skip a week and the next design waits for you. After a full set, the designs come round again.</p>
    </>}
  </section>
}
