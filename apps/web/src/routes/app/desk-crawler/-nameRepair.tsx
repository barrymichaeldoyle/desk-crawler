import { useState, type FormEvent } from 'react'
import { api } from '@trmnl-games/backend/api'
import { useIntent } from '../../../lib/intent'
import { Button, Card, ErrorNote } from '../../../lib/ui'

/** Shown only when an admin has masked this player's names (D23). Progress is untouched. */
export function NameRepair() {
  const replace = useIntent(api.users.replacePublicNames)
  const [alias, setAlias] = useState('')
  const [hero, setHero] = useState('')
  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    await replace.run({ publicAlias: alias, heroName: hero })
  }
  return (
    <Card title="Choose new names">
      <p>Your public names were hidden after a report. Pick new ones that follow the name rules; your hero's progress and gear are unchanged.</p>
      <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-semibold">New public name</span>
          <input value={alias} onChange={(e) => setAlias(e.target.value)} minLength={2} maxLength={20} required autoComplete="off" disabled={replace.pending} className="min-h-11 min-w-0 border-2 border-edge bg-ground px-3 text-base" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">New hero name</span>
          <input value={hero} onChange={(e) => setHero(e.target.value)} minLength={2} maxLength={16} required autoComplete="off" disabled={replace.pending} className="min-h-11 min-w-0 border-2 border-edge bg-ground px-3 text-base" />
        </label>
        <Button type="submit" pending={replace.pending} busyLabel="Saving names…">
          Save names
        </Button>
      </form>
      <ErrorNote message={replace.error} />
    </Card>
  )
}
