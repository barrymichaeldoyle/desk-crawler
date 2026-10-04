import { Show, SignIn } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { api } from '@trmnl-games/backend/api'
import { seo } from '../../../../lib/seo'
import { useIntent } from '../../../../lib/intent'
import { Button, Card, ErrorNote } from '../../../../lib/ui'
import { captureManagement, getManagedInstance } from '../../../../server/manageFns'

type Search = { uuid?: string; jwt?: string; invalid?: boolean }

export const Route = createFileRoute('/connect/trmnl/desk-crawler/manage')({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(typeof search.uuid === 'string' ? { uuid: search.uuid } : {}),
    ...(typeof search.jwt === 'string' ? { jwt: search.jwt } : {}),
    ...(search.invalid === true || search.invalid === 'true' ? { invalid: true } : {}),
  }),
  beforeLoad: async ({ search }) => {
    if (search.jwt !== undefined || search.uuid !== undefined) {
      // Verify immediately (the TRMNL token lives two minutes), then drop it from the URL.
      const result = await captureManagement({ data: { gameSlug: 'desk-crawler', uuid: search.uuid ?? '', jwt: search.jwt ?? '' } })
      throw redirect({ to: '/connect/trmnl/desk-crawler/manage', search: result.ok ? {} : { invalid: true }, replace: true })
    }
  },
  loader: async () => await getManagedInstance(),
  head: () => {
    const head = seo({ title: 'Manage TRMNL', index: false })
    return { ...head, meta: [...head.meta, { name: 'referrer', content: 'no-referrer' }] }
  },
  component: ManagePage,
})

function ManagePage() {
  const { uuid } = Route.useLoaderData()
  const { invalid } = Route.useSearch()
  return (
    <main id="main" className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-12">
      <h1 className="text-2xl font-bold">Desk Crawler on TRMNL</h1>
      {uuid === null ? (
        <Card>
          {invalid ? <p role="alert">That link expired or was not valid.</p> : null}
          <p>Open Desk Crawler from your TRMNL plugin settings and choose Configure to manage this installation.</p>
        </Card>
      ) : (
        <>
          <Show when="signed-out">
            <p>Sign in with the TRMNL Games account that connected this TRMNL.</p>
            <SignIn routing="hash" forceRedirectUrl="/connect/trmnl/desk-crawler/manage" signUpForceRedirectUrl="/connect/trmnl/desk-crawler/manage" />
          </Show>
          <Show when="signed-in">
            <Connection uuid={uuid} />
          </Show>
        </>
      )}
    </main>
  )
}

function Connection({ uuid }: { uuid: string }) {
  const { data } = useQuery(convexQuery(api.connections.forManagement, { uuid }))
  const disconnect = useIntent(api.connections.disconnect)
  if (data === undefined) return <p role="status" className="text-stone-600 dark:text-stone-400">Checking this installation…</p>
  if (data === null || !data.owned) {
    return (
      <Card title="Different account">
        <p>This TRMNL installation is linked to another TRMNL Games account. Sign out and sign in with the account you used to connect it. Accounts are never merged automatically.</p>
      </Card>
    )
  }
  const { instance, heroName } = data
  const settingsUrl = instance.pluginSettingId ? `https://trmnl.com/plugin_settings/${encodeURIComponent(instance.pluginSettingId)}/edit` : null
  return (
    <Card title="This installation">
      {instance.state === 'active' ? (
        <p>
          Showing <strong>{heroName ?? 'your hero'}</strong> on your TRMNL. Adventures continue whether or not the screen is connected.
        </p>
      ) : (
        <p>This installation is disconnected. Install Desk Crawler again from TRMNL to reconnect a screen; your hero keeps its progress.</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/app/desk-crawler" className="inline-flex min-h-11 items-center rounded-md bg-stone-900 px-4 font-semibold text-white dark:bg-stone-100 dark:text-stone-900">
          Open the companion
        </Link>
        {settingsUrl ? (
          <a href={settingsUrl} className="inline-flex min-h-11 items-center rounded-md border border-stone-400 px-4 font-semibold">
            Back to TRMNL
          </a>
        ) : null}
        {settingsUrl ? (
          <a href={`${settingsUrl}?force_refresh=true`} className="inline-flex min-h-11 items-center rounded-md border border-stone-400 px-4 font-semibold">
            Refresh preview in TRMNL
          </a>
        ) : null}
        {instance.state === 'active' ? (
          <Button variant="secondary" disabled={disconnect.pending} onClick={() => disconnect.run({ instanceId: instance.id })}>
            Disconnect this installation
          </Button>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-stone-600 dark:text-stone-400">Disconnecting stops new screens for this installation. TRMNL may keep showing the last image until you remove the plugin from your playlist.</p>
      <ErrorNote message={disconnect.error} />
    </Card>
  )
}
