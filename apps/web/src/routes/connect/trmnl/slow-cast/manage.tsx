import { Show, SignIn } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { api } from '@trmnl-games/backend/api'
import { useState } from 'react'
import { seo } from '../../../../lib/seo'
import { SwitchAccount } from '../../../../lib/switchAccount'
import { useIntent } from '../../../../lib/intent'
import { ActionFeedback, BUTTON_PRIMARY, BUTTON_SECONDARY, Button, Card, LINK_BUTTON, LoadingState } from '../../../../lib/ui'
import { captureManagement, getManagedInstance } from '../../../../server/manageFns'
import { useAnalyticsView } from '../../../../lib/analyticsProvider'
import { requireOpenGame } from '../../../../lib/gameAccess'

type Search = { uuid?: string; jwt?: string; invalid?: boolean }

export const Route = createFileRoute('/connect/trmnl/slow-cast/manage')({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(typeof search.uuid === 'string' ? { uuid: search.uuid } : {}),
    ...(typeof search.jwt === 'string' ? { jwt: search.jwt } : {}),
    ...(search.invalid === true || search.invalid === 'true' ? { invalid: true } : {}),
  }),
  beforeLoad: async ({ search }) => {
    if (search.jwt !== undefined || search.uuid !== undefined) {
      // Verify immediately (the TRMNL token lives two minutes), then drop it from the URL.
      const result = await captureManagement({ data: { gameSlug: 'slow-cast', uuid: search.uuid ?? '', jwt: search.jwt ?? '' } })
      throw redirect({ to: '/connect/trmnl/slow-cast/manage', search: result.ok ? {} : { invalid: true }, replace: true })
    }
  },
  loader: async ({ context }) => {
    await requireOpenGame(context, 'slow-cast')
    return await getManagedInstance({ data: { gameSlug: 'slow-cast' } })
  },
  head: () => {
    const head = seo({ title: 'Manage TRMNL', index: false })
    return { ...head, meta: [...head.meta, { name: 'referrer', content: 'no-referrer' }] }
  },
  component: ManagePage,
})

function ManagePage() {
  const { uuid } = Route.useLoaderData()
  const { invalid } = Route.useSearch()
  useAnalyticsView('management opened', { valid_handoff: uuid !== null, invalid_link: invalid ?? false })
  return (
    <main id="main" className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Slow Cast on TRMNL</h1>
      {uuid === null ? (
        <Card>
          {invalid ? <p role="alert">That link expired or was not valid.</p> : null}
          <p>Open Slow Cast from your TRMNL plugin settings and choose Configure to manage this installation.</p>
        </Card>
      ) : (
        <>
          <Show when="signed-out">
            <p>Sign in with the TRMNL Games account that connected this TRMNL.</p>
            <SignIn routing="hash" forceRedirectUrl="/connect/trmnl/slow-cast/manage" signUpForceRedirectUrl="/connect/trmnl/slow-cast/manage" />
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
  const { data } = useQuery(convexQuery(api.connections.forManagement, { gameSlug: 'slow-cast', uuid }))
  // The verified reconnection flow (D69) is Desk Crawler's: a revoked Slow Cast installation starts again from Install.
  const disconnect = useIntent(api.connections.disconnect)
  const [confirming, setConfirming] = useState(false)
  useAnalyticsView('management account mismatch', {}, data !== undefined && (data === null || !data.owned))
  if (data === undefined) return <LoadingState label="Checking this installation…" />
  if (data === null || !data.owned) {
    return (
      <Card title={data === null ? 'Not connected yet' : 'Different account'}>
        <p>{data === null ? 'Start from Install in TRMNL to connect this installation to your account.' : 'This TRMNL installation is linked to another TRMNL Games account. Sign out and sign in with the account you used to connect it. Accounts are never merged automatically.'}</p>
        <div className="mt-3">
          <SwitchAccount returnTo="/connect/trmnl/slow-cast/manage" />
        </div>
      </Card>
    )
  }
  const { instance, heroName } = data
  const settingsUrl = instance.pluginSettingId ? `https://trmnl.com/plugin_settings/${encodeURIComponent(instance.pluginSettingId)}/edit` : null
  return (
    <Card title="This installation">
      {instance.state === 'active' ? (
        <p>
          Showing <strong>{heroName ?? 'your angler'}</strong>'s fishing on your TRMNL. Fishing continues whether or not the screen is connected.
        </p>
      ) : (
        <p>This installation is disconnected. Install Slow Cast again from TRMNL to reconnect it.</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/app/slow-cast" className={`${LINK_BUTTON} ${BUTTON_PRIMARY}`}>
          Open the companion
        </Link>
        {settingsUrl ? (
          <a href={settingsUrl} className={`${LINK_BUTTON} ${BUTTON_SECONDARY}`}>
            Back to TRMNL
          </a>
        ) : null}
        {settingsUrl ? (
          <a href={`${settingsUrl}?force_refresh=true`} className={`${LINK_BUTTON} ${BUTTON_SECONDARY}`}>
            Refresh preview in TRMNL
          </a>
        ) : null}
        {instance.state === 'active' ? (
          <Button variant="quiet" disabled={disconnect.pending} onClick={() => setConfirming(true)}>
            Disconnect this installation
          </Button>
        ) : null}
      </div>
      {confirming && instance.state === 'active' ? <div className="mt-4 border-t border-rule pt-4"><p className="font-semibold">Disconnect this installation?</p><p className="mt-2 text-sm">New screens stop for this installation. TRMNL keeps the last image until you remove the plugin from its playlist.</p><div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" pending={disconnect.pending} busyLabel="Disconnecting…" onClick={async () => { if (await disconnect.run({ instanceId: instance.id }, 'Installation disconnected.')) setConfirming(false) }}>Confirm disconnect</Button><Button variant="quiet" disabled={disconnect.pending} onClick={() => setConfirming(false)}>Cancel</Button></div></div> : null}
      <ActionFeedback {...disconnect} />
    </Card>
  )
}
