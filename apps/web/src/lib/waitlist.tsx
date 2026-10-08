import { SignUpButton } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { api } from '@trmnl-games/backend/api'
import { useAction, useMutation } from 'convex/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { captureAnalytics } from './analytics'
import { errorMessage } from './intent'
import { Button, ErrorNote } from './ui'

/** Set after a signup so the account the visitor creates next attaches to that entry without asking again. */
const JOINED_KEY = 'tg_waitlist_joined_v1'
const INPUT = 'min-h-11 min-w-0 flex-1 border-2 border-edge bg-ground px-3 text-base'

/** Launch-list signup (D105). Email only; an account is offered afterwards and stays optional. */
export function WaitlistForm({ source }: { source: 'notify' | 'pitch' | 'landing' }) {
  const join = useMutation(api.waitlist.join)
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [joined, setJoined] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError(null)
    try {
      await join({ email, source, ...(website ? { website } : {}) })
      try { window.sessionStorage.setItem(JOINED_KEY, '1') } catch { /* Linking later stays a one-click choice. */ }
      captureAnalytics('waitlist joined', { source })
      setJoined(email.trim())
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  if (joined) {
    return (
      <div className="flex flex-col gap-4" role="status">
        <p><strong>You're on the list.</strong> We'll send one email to {joined} when Desk Crawler is in the TRMNL marketplace, then delete your address.</p>
        <div className="flex flex-col gap-2 border-l-4 border-rule pl-4">
          <p className="text-sm text-muted">Want to get ahead? Create your TRMNL Games account now. You'll still install Desk Crawler from TRMNL at launch, and the account signs you straight in.</p>
          <div><SignUpButton mode="modal" forceRedirectUrl="/app/desk-crawler"><Button variant="secondary">Create account (optional)</Button></SignUpButton></div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2" noValidate={false}>
      <label htmlFor={`waitlist-${source}`} className="font-semibold">Get one email when it's live</label>
      <div className="flex flex-wrap gap-3">
        <input id={`waitlist-${source}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} autoComplete="email" placeholder="you@example.com" disabled={pending} className={INPUT} />
        {/* Hidden from people and assistive tech; bots that fill every field are dropped quietly. */}
        <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <Button type="submit" pending={pending} busyLabel="Adding…">Notify me</Button>
      </div>
      <p className="text-sm text-muted">No newsletter. One launch email, then your address is deleted.</p>
      <ErrorNote message={error} />
    </form>
  )
}

/** Signed-in players without a hero: join with the account's verified email, or see that they already have. */
export function WaitlistAccount() {
  const { data: entry, isPending } = useQuery(convexQuery(api.waitlist.mine, {}))
  const joinWithAccount = useAction(api.waitlist.joinWithAccount)
  const leave = useMutation(api.waitlist.leaveWithAccount)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autoLinked = useRef(false)

  async function run(task: () => Promise<unknown>) {
    setPending(true)
    setError(null)
    try { await task() } catch (caught) { setError(errorMessage(caught)) } finally { setPending(false) }
  }

  // A visitor who just joined and then created an account already asked for the email: attach it once.
  useEffect(() => {
    if (isPending || entry || autoLinked.current) return
    let joinedThisSession = false
    try { joinedThisSession = window.sessionStorage.getItem(JOINED_KEY) === '1'; window.sessionStorage.removeItem(JOINED_KEY) } catch { /* Fall back to the button. */ }
    if (!joinedThisSession) return
    autoLinked.current = true
    void run(() => joinWithAccount({}))
  }, [isPending, entry])

  if (isPending) return null
  return (
    <div className="mt-3 flex flex-col gap-2">
      {entry
        ? <>
            <p>You're on the launch list. We'll email {entry.email} once Desk Crawler is in the TRMNL marketplace.</p>
            <div><Button variant="quiet" pending={pending} busyLabel="Removing…" onClick={() => void run(() => leave({}))}>Remove me from the list</Button></div>
          </>
        : <>
            <p>Desk Crawler isn't in the marketplace yet. Want one email when it is?</p>
            <div><Button pending={pending} busyLabel="Adding…" onClick={() => void run(async () => { await joinWithAccount({}); captureAnalytics('waitlist joined', { source: 'account' }) })}>Email me at launch</Button></div>
          </>}
      <ErrorNote message={error} />
    </div>
  )
}
