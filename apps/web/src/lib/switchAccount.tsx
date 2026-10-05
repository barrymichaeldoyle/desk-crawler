import { useClerk, useUser } from '@clerk/tanstack-react-start'
import { useState } from 'react'
import { Button } from './ui'

/**
 * Names the sign-in in use and offers to switch it. Clerk keeps each email/provider as a separate user unless they share a
 * verified email, so a player who signs in a different way from last time lands in a new account. The pending TRMNL
 * install/manage cookie is not tied to Clerk, so signing out returns to the same step.
 */
export function SwitchAccount({ returnTo }: { returnTo: string }) {
  const { user } = useUser()
  const clerk = useClerk()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const email = user?.primaryEmailAddress?.emailAddress
  return (
    <p className="text-sm text-stone-600 dark:text-stone-400">
      {email ? <>Signed in with {email}. </> : null}Not the right account?{' '}
      <Button variant="quiet" className="px-0" pending={pending} busyLabel="Switching…" onClick={async () => { setPending(true); setFailed(false); try { await clerk.signOut({ redirectUrl: returnTo }) } catch { setFailed(true); setPending(false) } }}>
        Switch account
      </Button>
      {failed ? <span role="alert" className="block text-red-700 dark:text-red-400">We couldn’t sign out. Check your connection and try again.</span> : null}
    </p>
  )
}
