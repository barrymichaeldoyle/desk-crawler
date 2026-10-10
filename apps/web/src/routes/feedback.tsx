import { Show, SignInButton } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '@trmnl-games/backend/api'
import { useMutation } from 'convex/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { captureAnalytics } from '../lib/analytics'
import { errorMessage } from '../lib/intent'
import { ProsePage, SUPPORT_EMAIL } from '../lib/prose'
import { seo } from '../lib/seo'
import { Button, ErrorNote } from '../lib/ui'

const MAX = 2000
const MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('TRMNL Games feedback')}`

/** Player feedback (D107): one text box for signed-in players, email for everyone else. */
export const Route = createFileRoute('/feedback')({
  validateSearch: (search: Record<string, unknown>): { from?: string } => (typeof search.from === 'string' && search.from.startsWith('/') ? { from: search.from.slice(0, 120) } : {}),
  head: () => seo({ title: 'Send feedback', path: '/feedback', description: 'Send ideas, bug reports or anything else about TRMNL Games straight to the developer.' }),
  component: FeedbackPage,
})

function FeedbackPage() {
  const { from } = Route.useSearch()
  return (
    <ProsePage title="Send feedback">
      <p>Send ideas, bug reports, balance complaints or things you enjoy. Barry, who builds TRMNL Games, reads every message.</p>
      <Show when="signed-in"><FeedbackForm page={from} /></Show>
      <Show when="signed-out">
        <p>Sign in first, so a reply can reach you.</p>
        <div><SignInButton mode="modal" forceRedirectUrl={from ? `/feedback?from=${encodeURIComponent(from)}` : '/feedback'}><Button>Sign in to send feedback</Button></SignInButton></div>
        <p className="text-sm text-muted">Can't sign in or create an account? Email <a href={MAILTO}>{SUPPORT_EMAIL}</a> instead.</p>
      </Show>
    </ProsePage>
  )
}

function FeedbackForm({ page }: { page?: string }) {
  const send = useMutation(api.feedback.send)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  // The form leaves the page on success: focus moves to the confirmation so it is announced.
  const confirmation = useRef<HTMLDivElement>(null)
  useEffect(() => { if (sent) confirmation.current?.focus() }, [sent])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError(null)
    try {
      await send({ message, ...(page ? { page } : {}) })
      captureAnalytics('feedback sent', {})
      setMessage('')
      setSent(true)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <div ref={confirmation} tabIndex={-1} role="status" className="flex flex-col gap-3 outline-none">
        <p><strong>Thanks, it's sent.</strong> Barry reads every message and replies to your account email when there's something to follow up.</p>
        <div><Button variant="secondary" onClick={() => setSent(false)}>Send another</Button></div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <label htmlFor="feedback-message" className="font-semibold">Your message</label>
      <textarea id="feedback-message" value={message} onChange={(e) => setMessage(e.target.value)} required maxLength={MAX} rows={6} readOnly={pending} aria-invalid={error ? true : undefined} aria-describedby={error ? 'feedback-hint feedback-error' : 'feedback-hint'} className="w-full border-2 border-edge bg-ground p-3 text-base" />
      <p id="feedback-hint" className="text-sm text-muted">{message.length > MAX - 200 ? `${MAX - message.length} characters left. ` : ''}Please leave out passwords and TRMNL codes.</p>
      <div><Button type="submit" pending={pending} busyLabel="Sending…" disabled={!message.trim()}>Send feedback</Button></div>
      <ErrorNote id="feedback-error" message={error} />
    </form>
  )
}
