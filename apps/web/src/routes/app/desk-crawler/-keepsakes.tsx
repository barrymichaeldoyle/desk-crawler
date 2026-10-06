import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { useMutation } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '@trmnl-games/backend/api'
import { DESK_KEEPSAKES, keepsakeShelf, keepsakeWeek } from '@trmnl-games/desk-crawler/content/keepsakes'
import { errorMessage } from '../../../lib/intent'
import { useOnline } from '../../../lib/network'
import { Submission } from '../../../lib/submission'
import { ActionFeedback, Button } from '../../../lib/ui'

export function KeepsakeIcon({ pixels }: { pixels: readonly string[] }) {
  const path = pixels.flatMap((row, y) => [...row.matchAll(/#+/g)].map((run) => `M${run.index} ${y}h${run[0].length}v1h-${run[0].length}z`)).join('')
  return <svg viewBox="0 0 8 8" width="32" height="32" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true" className="shrink-0"><path d={path} /></svg>
}

export function DeskKeepsakes() {
  const { data: collection } = useQuery(convexQuery(api.keepsakes.mine, {}))
  const mutate = useMutation(api.keepsakes.claim)
  const online = useOnline()
  const submission = useRef(new Submission())
  const inFlight = useRef(false)
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const collectedThisWeek = collection?.lastClaimWeek != null && collection.lastClaimWeek >= keepsakeWeek(now)
  const next = DESK_KEEPSAKES[(collection?.totalCollected ?? 0) % DESK_KEEPSAKES.length]!

  async function claim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return
    setError(null)
    setMessage(null)
    if (!online) { setError('You are offline. Reconnect, then try again.'); return }
    const normalized = code.trim().toUpperCase().replace(/[\s-]/g, '')
    if (!/^[A-HJ-NP-Z2-9]{8}$/.test(normalized)) { setError('Enter the eight-letter-and-number code shown beside “Keepsake” on your TRMNL.'); return }
    inFlight.current = true
    setPending(true)
    try {
      await submission.current.run({ code: normalized }, async (input) => {
        const result = await mutate(input)
        if (result.outcome === 'invalid_code') setError('That code doesn’t match your TRMNL connection. Check the letters on your screen, or wait for its next refresh.')
        else if (result.outcome === 'already_claimed') setMessage('This week’s keepsake is already on your shelf. The next code arrives next week.')
        else {
          const earned = DESK_KEEPSAKES[(result.totalCollected - 1) % DESK_KEEPSAKES.length]!
          setMessage(`${earned.name} collected.`)
          setCode('')
        }
      }, (caught) => caught instanceof ConvexError)
    } catch (caught) { setError(errorMessage(caught)) }
    finally { inFlight.current = false; setPending(false) }
  }

  return <section id="desk-keepsakes" aria-labelledby="keepsakes-title" className="window min-w-0 scroll-mt-20 px-4 pt-3 pb-4 sm:px-5">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="keepsakes-title" className="font-display text-2xl font-bold">Desk keepsakes</h2>
      {collection ? <p className="text-sm tabular-nums">{collection.totalCollected.toLocaleString()} collected</p> : null}
    </div>
    <p className="mt-3 max-w-prose text-sm text-muted">A souvenir for keeping Desk Crawler on your desk. Once a week your TRMNL shows a keepsake code. Enter it here to add the design to your shelf.</p>
    {!collection ? <p role="status" className="mt-4 text-sm">Loading your collection…</p> : <>
      <div className="my-5 flex items-center gap-4">
        <KeepsakeIcon pixels={next.pixels} />
        <div><p className="font-semibold">{collectedThisWeek ? 'Coming next: ' : 'Next keepsake: '}{next.name}</p><p className="mt-1 text-sm text-muted">{next.description}</p></div>
      </div>
      {collectedThisWeek ? <p className="text-sm font-semibold">Collected this week. {collection.nextAvailableAt ? `The next code arrives ${new Date(collection.nextAvailableAt).toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' })}.` : 'The next code arrives next week.'}</p> : <form onSubmit={claim} className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="keepsake-code" className="text-sm font-semibold">Code from your TRMNL</label>
          <input id="keepsake-code" value={code} onChange={(event) => { setCode(event.target.value); setError(null); setMessage(null) }} placeholder="ABCD-EFGH" maxLength={16} autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={pending || !collection.connected} aria-describedby="keepsake-help" aria-invalid={error ? true : undefined} className="min-h-11 w-48 border-2 border-edge bg-ground px-3 text-base uppercase" />
        </div>
        <Button type="submit" pending={pending} busyLabel="Collecting…" disabled={!collection.connected || !code.trim()}>Collect keepsake</Button>
      </form>}
      <p id="keepsake-help" className="mt-3 max-w-prose text-sm text-muted">{collection.connected ? 'The code sits beside “Keepsake” on your TRMNL screen. The preview on this site leaves it out.' : 'Reconnect the Desk Crawler plugin in TRMNL to receive keepsake codes.'}</p>
      <ActionFeedback error={error} message={message} />
      <ul aria-label="Your keepsake shelf" className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
        {keepsakeShelf(collection.totalCollected).map((item) => <li key={item.id} className={`flex items-start gap-3 ${item.count ? '[&>svg]:text-gold-ink' : 'text-muted'}`}>
          <KeepsakeIcon pixels={item.pixels} />
          <div><p className="text-sm font-semibold">{item.name}</p><p className="mt-1 text-sm tabular-nums">{item.count ? `${item.count.toLocaleString()} collected` : 'Not collected yet'}</p></div>
        </li>)}
      </ul>
      <p className="mt-5 max-w-prose text-sm text-muted">Keepsakes are for your shelf only. Skip a week and the next design waits for you. After a full set, the designs come round again.</p>
    </>}
  </section>
}
