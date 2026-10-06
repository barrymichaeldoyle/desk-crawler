import { Show, SignIn } from '@clerk/tanstack-react-start'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { api } from '@trmnl-games/backend/api'
import { useEffect, useState } from 'react'
import type { Id } from '@trmnl-games/backend/data-model'
import { seo } from '../../../../lib/seo'
import { SwitchAccount } from '../../../../lib/switchAccount'
import { useIntent } from '../../../../lib/intent'
import { ActionFeedback, BUTTON_PRIMARY, BUTTON_SECONDARY, Button, Card, LINK_BUTTON, LoadingState } from '../../../../lib/ui'
import { captureManagement, getManagedInstance } from '../../../../server/manageFns'
import { useAnalyticsView } from '../../../../lib/analyticsProvider'

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
  loader: async () => await getManagedInstance({ data: { gameSlug: 'desk-crawler' } }),
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
      <h1 className="font-display text-3xl font-bold">Desk Crawler on TRMNL</h1>
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
  const { data: reconnect } = useQuery(convexQuery(api.trmnl.reconnectionStatus, {}))
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!reconnect) return
    const expires = Math.min(reconnect.expiresAt, reconnect.proofExpiresAt ?? reconnect.expiresAt)
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, expires - Date.now()) + 10)
    setNow(Date.now())
    return () => window.clearTimeout(timer)
  }, [reconnect])
  const disconnect = useIntent(api.connections.disconnect)
  const [confirming, setConfirming] = useState(false)
  useAnalyticsView('management account mismatch', {}, reconnect === null && data !== undefined && (data === null || !data.owned))
  if (data === undefined || reconnect === undefined) return <LoadingState label="Checking this installation…" />
  if (reconnect) {
    if (reconnect.expiresAt <= now) return <Card title="Reconnection expired"><p>Start Install again from Desk Crawler in TRMNL to reconnect.</p></Card>
    if (!reconnect.verified || reconnect.verifiedUuid !== uuid || !reconnect.proofExpiresAt || reconnect.proofExpiresAt <= now) return <Card title="Verify your installation"><p>Now that you’re signed in, open this plugin’s settings in TRMNL and choose Configure again. Then confirm the connection here.</p></Card>
    return <Reconnect attemptId={reconnect.id} publicAlias={reconnect.publicAlias} heroName={reconnect.heroName} />
  }
  if (data === null || !data.owned) {
    return (
      <Card title={data === null ? 'Not connected yet' : 'Different account'}>
        <p>{data === null ? 'Start from Install in TRMNL to connect this installation to your account.' : 'This TRMNL installation is linked to another TRMNL Games account. Sign out and sign in with the account you used to connect it. Accounts are never merged automatically.'}</p>
        <div className="mt-3">
          <SwitchAccount returnTo="/connect/trmnl/desk-crawler/manage" />
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
          Showing <strong>{heroName ?? 'your hero'}</strong> on your TRMNL. Adventures continue whether or not the screen is connected.
        </p>
      ) : (
        <p>This installation is disconnected. Install Desk Crawler again from TRMNL to reconnect it.</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/app/desk-crawler" className={`${LINK_BUTTON} ${BUTTON_PRIMARY}`}>
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

function Reconnect({ attemptId, publicAlias, heroName }: { attemptId: Id<'trmnlReconnectAttempts'>; publicAlias: string; heroName: string }) {
  const connect = useIntent(api.trmnl.completeReconnection)
  const navigate = useNavigate()
  async function confirm() {
    const result = await connect.run({ attemptId, confirm: 'CONNECT' })
    if (result) await navigate({ to: '/app/desk-crawler', replace: true })
  }
  return <div data-analytics-private><Card title="Confirm your connection">
    <p>TRMNL verified this installation. Connect it to <strong>{publicAlias}</strong> and hero <strong>{heroName}</strong>?</p>
    <p className="mt-3">Previously deleted progress stays deleted. This connects only the installation you just verified.</p>
    <div className="mt-4 flex flex-col gap-3">
      <Button onClick={confirm} pending={connect.pending} busyLabel="Connecting…">Confirm and connect</Button>
      <ActionFeedback error={connect.error} message={connect.message} />
      <SwitchAccount returnTo="/connect/trmnl/desk-crawler/manage" />
    </div>
  </Card></div>
}
