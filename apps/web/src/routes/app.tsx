import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AuthShell } from '../lib/platformShell'
import { seo } from '../lib/seo'

export const Route = createFileRoute('/app')({
  head: () => seo({ title: 'My games', index: false }),
  component: () => <AuthShell><Outlet /></AuthShell>,
})
