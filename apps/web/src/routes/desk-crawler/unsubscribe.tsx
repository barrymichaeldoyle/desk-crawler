import { createFileRoute } from '@tanstack/react-router'
import { api } from '@trmnl-games/backend/api'
import { useMutation } from 'convex/react'
import { useEffect, useRef, useState } from 'react'
import { errorMessage } from '../../lib/intent'
import { ProsePage, SUPPORT_EMAIL } from '../../lib/prose'
import { seo } from '../../lib/seo'
import { Button, ErrorNote } from '../../lib/ui'

export const Route = createFileRoute('/desk-crawler/unsubscribe')({
  validateSearch: (search: Record<string, unknown>): { id?: string; token?: string } => ({
    ...(typeof search.id === 'string' ? { id: search.id } : {}),
    ...(typeof search.token === 'string' ? { token: search.token } : {}),
  }),
  headers: () => ({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' }),
  head: () => seo({ title: 'Leave the launch list', index: false }),
  component: Unsubscribe,
})

/** The launch email's unsubscribe link (D105). Removal waits for a click so link scanners never trigger it. */
function Unsubscribe() {
  const { id, token } = Route.useSearch()
  const leave = useMutation(api.waitlist.leave)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The Remove button leaves the page once it works: focus the confirmation so it is announced.
  const confirmation = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if (done) confirmation.current?.focus() }, [done])
  async function onLeave() {
    if (!id || !token) return
    setPending(true)
    setError(null)
    try { await leave({ id, token }); setDone(true) } catch (caught) { setError(errorMessage(caught)) } finally { setPending(false) }
  }
  return (
    <ProsePage title="Leave the launch list">
      <div data-analytics-private className="flex flex-col gap-4">
        {!id || !token
          ? <p role="alert">This link is incomplete. Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we'll remove you.</p>
          : done
            ? <p ref={confirmation} tabIndex={-1} role="status" className="outline-none">Done. Your address is off the Desk Crawler launch list and we won't email it again.</p>
            : <>
                <p>Remove your email from the Desk Crawler launch list? You won't get the launch email.</p>
                <div><Button onClick={() => void onLeave()} pending={pending} busyLabel="Removing…">Remove me</Button></div>
              </>}
        <ErrorNote message={error} />
      </div>
    </ProsePage>
  )
}
