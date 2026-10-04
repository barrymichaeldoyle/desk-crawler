import { Show, SignIn } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { api } from '@trmnl-games/backend/api'
import { seo } from '../../../../lib/seo'
import { captureInstall, finishInstall, getPendingInstall } from '../../../../server/installFns'

type Search = { code?: string; installation_callback_url?: string; invalid?: boolean }

export const Route = createFileRoute('/connect/trmnl/desk-crawler/install')({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(typeof search.code === 'string' ? { code: search.code } : {}),
    ...(typeof search.installation_callback_url === 'string' ? { installation_callback_url: search.installation_callback_url } : {}),
    ...(search.invalid === true || search.invalid === 'true' ? { invalid: true } : {}),
  }),
  beforeLoad: async ({ search }) => {
    if (search.code !== undefined || search.installation_callback_url !== undefined) {
      // Move the code into the encrypted cookie, then drop it from the URL before any third-party script loads.
      const result = await captureInstall({ data: { gameSlug: 'desk-crawler', code: search.code ?? '', callback: search.installation_callback_url ?? '' } })
      throw redirect({ to: '/connect/trmnl/desk-crawler/install', search: result.ok ? {} : { invalid: true }, replace: true })
    }
  },
  loader: async () => await getPendingInstall(),
  head: () => {
    const head = seo({ title: 'Connect TRMNL', index: false })
    return { ...head, meta: [...head.meta, { name: 'referrer', content: 'no-referrer' }] }
  },
  component: InstallPage,
})

function InstallPage() {
  const { pending } = Route.useLoaderData()
  const { invalid } = Route.useSearch()

  if (!pending) {
    return (
      <Page>
        <h1 className="text-2xl font-bold">Connect TRMNL</h1>
        {invalid ? <p role="alert">That installation link was not valid.</p> : null}
        <p>Start from the Desk Crawler plugin in your TRMNL account and choose Install. TRMNL will bring you back here.</p>
      </Page>
    )
  }
  return (
    <Page>
      <h1 className="text-2xl font-bold">Connect TRMNL to Desk Crawler</h1>
      <Show when="signed-out">
        <p>Sign in or create your TRMNL Games account to continue.</p>
        <SignIn routing="hash" forceRedirectUrl="/connect/trmnl/desk-crawler/install" signUpForceRedirectUrl="/connect/trmnl/desk-crawler/install" />
      </Show>
      <Show when="signed-in">
        <ConnectForm />
      </Show>
    </Page>
  )
}

function ConnectForm() {
  const { data: me } = useQuery(convexQuery(api.users.me, {}))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (me === undefined) return <p role="status">Loading your account…</p>
  const needsProfile = !me?.user
  const needsHero = !me?.hero

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    const form = new FormData(event.currentTarget)
    const result = await finishInstall({
      data: {
        ...(needsProfile ? { publicAlias: String(form.get('publicAlias') ?? '') } : {}),
        ...(needsHero ? { heroName: String(form.get('heroName') ?? '') } : {}),
      },
    })
    if (result.ok) {
      window.location.assign(result.callbackUrl)
      return
    }
    setError(result.message)
    setSubmitting(false)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {needsProfile ? (
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Public name</span>
          <span className="text-sm text-stone-600 dark:text-stone-400">Shown publicly to other players on leaderboards and TRMNL screens. Use any name you're happy to share; never include contact details.</span>
          <input name="publicAlias" required minLength={2} maxLength={20} className="min-h-11 rounded-md border border-stone-400 bg-white px-3 text-stone-900" autoComplete="off" />
        </label>
      ) : (
        <p>
          Signed in as <strong>{me?.user?.publicAlias}</strong>.
        </p>
      )}
      {needsHero ? (
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Hero name</span>
          <input name="heroName" required minLength={2} maxLength={16} defaultValue="Steve" className="min-h-11 rounded-md border border-stone-400 bg-white px-3 text-stone-900" autoComplete="off" />
        </label>
      ) : (
        <p>
          Your hero <strong>{me?.hero?.name}</strong> will appear on this TRMNL.
        </p>
      )}
      {error ? (
        <p role="alert" className="font-semibold text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={submitting} className="min-h-11 rounded-md bg-stone-900 px-4 font-semibold text-white disabled:opacity-60 dark:bg-stone-100 dark:text-stone-900">
        {submitting ? 'Connecting…' : 'Connect this TRMNL installation'}
      </button>
      <p className="text-sm text-stone-600 dark:text-stone-400">Next, TRMNL asks you to save the plugin. Saving starts your hero's adventures.</p>
    </form>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return <main id="main" className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-12">{children}</main>
}
