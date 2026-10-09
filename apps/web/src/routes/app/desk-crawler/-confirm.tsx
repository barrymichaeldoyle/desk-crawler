import type { ReactNode } from 'react'
import { Button } from '../../../lib/ui'
import { Sheet, SheetTitle } from './-bagSlots'

type Choice = { confirmLabel: string; busyLabel: string; cancelLabel: string; pending: boolean; disabled?: boolean; onConfirm: () => void; onCancel: () => void }

/** The two buttons every confirmation ends with: go ahead, or keep things as they are. */
export function ConfirmButtons({ confirmLabel, busyLabel, cancelLabel, pending, disabled = false, onConfirm, onCancel }: Choice) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button pending={pending} busyLabel={busyLabel} disabled={disabled} onClick={onConfirm}>{confirmLabel}</Button>
      <Button allowOffline variant="secondary" disabled={pending} onClick={onCancel}>{cancelLabel}</Button>
    </div>
  )
}

/**
 * Ask before an action that could set the player back or slow them down: what it costs, how often it can be done,
 * whether it can be undone. A stray tap only opens this; the confirm button commits.
 */
export function ConfirmSheet({ open, title, children, ...choice }: Omit<Choice, 'onCancel'> & { open: boolean; title: ReactNode; children: ReactNode; onClose: () => void }) {
  const { onClose, ...rest } = choice
  return (
    <Sheet open={open} onClose={() => { if (!choice.pending) onClose() }} label={typeof title === 'string' ? title : 'Confirm'}>
      {open ? (
        <div className="flex flex-col gap-3">
          <SheetTitle>{title}</SheetTitle>
          {children}
          <ConfirmButtons {...rest} onCancel={onClose} />
        </div>
      ) : null}
    </Sheet>
  )
}

/** A short list of consequences, one per line. */
export const Consequences = ({ children }: { children: ReactNode }) => <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">{children}</ul>

/** What pausing costs, the same on the Hero page and in Settings. */
export const PauseConsequences = () => (
  <Consequences>
    <li>Your hero stops until you resume: <strong>no XP, gold, finds or to-do progress</strong> while paused, and nothing is caught up later.</li>
    <li>Recent XP keeps ageing out, so your hero can drop down or off the daily and weekly boards.</li>
    <li>You can resume any time; your hero rejoins on the next adventure.</li>
  </Consequences>
)
