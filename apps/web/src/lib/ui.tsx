import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { useOnline } from './network'

/**
 * The gold menu choice: shared by Button and links styled as the primary action. A press sinks the key two pixels
 * into its lip, so a tap answers on the spot before the server does.
 */
export const BUTTON_PRIMARY = 'hud text-hud-sm border-[3px] border-night bg-gold text-night shadow-[inset_0_-4px_0_var(--color-gold-lo)] hover:bg-gold-hi active:translate-y-0.5 active:shadow-[inset_0_-2px_0_var(--color-gold-lo)]'
/** The cream-edged alternative, for links that act like a secondary button; a press inverts it. */
export const BUTTON_SECONDARY = 'hud text-hud-sm border-[3px] border-edge text-ink hover:bg-ink hover:text-night active:bg-ink active:text-night'
/** Layout for a Link that wears a button style. */
export const LINK_BUTTON = 'inline-flex min-h-11 items-center px-4 py-2 no-underline'

export function Button({ variant = 'primary', className = '', pending = false, busyLabel = 'Working…', allowOffline = false, children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; pending?: boolean; busyLabel?: string; allowOffline?: boolean }) {
  const online = useOnline()
  const styles = {
    primary: BUTTON_PRIMARY,
    secondary: BUTTON_SECONDARY,
    quiet: 'font-semibold text-muted underline underline-offset-4 hover:text-ink active:text-ink',
    danger: 'hud text-hud-sm border-[3px] border-hp text-hp-ink hover:bg-hp hover:text-night active:bg-hp active:text-night',
  }[variant]
  return <button type="button" {...props} aria-busy={pending || undefined} disabled={disabled || pending || (!online && !allowOffline)} className={`min-h-11 px-4 py-2 ${styles} disabled:cursor-not-allowed disabled:border-dashed disabled:border-faint disabled:bg-transparent disabled:text-muted disabled:shadow-none disabled:no-underline disabled:active:translate-y-0 ${className}`}>{pending ? busyLabel : children}</button>
}

export type Notice = { kind: 'ok' | 'error'; text: string; key: number }

/**
 * The latest action's outcome for a page, as one pinned notice (D98): successes clear themselves, errors stay until
 * dismissed, and nothing on the page moves. `notify` is stable, so intents can pass it as their feedback callback.
 */
export function useNotice(): { notice: Notice | null; notify: (feedback: { error: string | null; message: string | null }) => void; dismiss: () => void } {
  const [notice, setNotice] = useState<Notice | null>(null)
  const [handlers] = useState(() => ({
    notify: ({ error, message }: { error: string | null; message: string | null }) => setNotice({ kind: error ? 'error' : 'ok', text: error ?? message ?? '', key: Date.now() }),
    dismiss: () => setNotice(null),
  }))
  return { notice, ...handlers }
}

/** The pinned notice above the phone's bottom edge, lifted above a pinned bar when one is showing. */
export function NoticeBar({ notice, lifted = false, onDismiss }: { notice: Notice | null; lifted?: boolean; onDismiss: () => void }) {
  const dismiss = useRef(onDismiss)
  dismiss.current = onDismiss
  useEffect(() => {
    if (!notice || notice.kind === 'error') return
    const timer = setTimeout(() => dismiss.current(), 5000)
    return () => clearTimeout(timer)
  }, [notice])
  const text = notice?.text ?? ''
  return (
    <div className={`pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4 ${lifted ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]' : 'bottom-[calc(1rem+env(safe-area-inset-bottom))]'}`}>
      <div role="status" aria-live="polite" className="contents">{notice?.kind === 'ok' ? <NoticePanel key={notice.key} text={text} tone="text-xp-ink" onDismiss={onDismiss} /> : null}</div>
      <div role="alert" className="contents">{notice?.kind === 'error' ? <NoticePanel key={notice.key} text={text} tone="text-hp-ink" onDismiss={onDismiss} /> : null}</div>
    </div>
  )
}

function NoticePanel({ text, tone, onDismiss }: { text: string; tone: string; onDismiss: () => void }) {
  return <div className="window notice-rise pointer-events-auto flex w-full max-w-md items-center gap-3 px-4 py-2 text-sm">
    <p className={`min-w-0 flex-1 font-semibold ${tone}`}>{text}</p>
    <button type="button" aria-label="Dismiss" onClick={onDismiss} className="hud text-hud-sm flex size-11 shrink-0 items-center justify-center text-muted hover:text-ink active:text-ink">×</button>
  </div>
}

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  const id = useId()
  return (
    <section aria-labelledby={title ? id : undefined} className={`window min-w-0 px-4 pt-3 pb-4 sm:px-5 ${className}`}>
      {title ? <h2 id={id} className="mb-3 font-display text-2xl font-bold">{title}</h2> : null}
      {children}
    </section>
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return <div role="status" className="min-h-48 space-y-5 py-4 text-muted">
    <p>{label}</p>
    <div aria-hidden="true" className="space-y-4">
      <div className="h-6 w-2/3 bg-rule" />
      <div className="h-3 w-full bg-rule" />
      <div className="h-3 w-4/5 bg-rule" />
    </div>
  </div>
}

export function ActionFeedback({ error, message }: { error: string | null; message: string | null }) {
  // While empty the status line leaves the flow (no stray flex gap under a row of buttons) but stays
  // in the DOM, so the live region exists before a message arrives and screen readers announce it.
  return <><ErrorNote message={error} /><p role="status" className="text-sm font-semibold empty:absolute">{error ? '' : message}</p></>
}

const METER_FILL = { hp: 'bg-hp', xp: 'bg-xp', gold: 'bg-gold', sky: 'bg-sky' } as const
const METER_INK = { hp: 'text-hp-ink', xp: 'text-xp-ink', gold: 'text-gold-ink', sky: 'text-sky-ink' } as const

/** A game stat bar: night track in a two-pixel edge, coloured fill with a one-pixel highlight row. */
export function Meter({ label, value, max, tone = 'xp' }: { label: string; value: number; max: number; tone?: keyof typeof METER_FILL }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value * 100) / max))) : 0
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
        <span className={`label-px ${METER_INK[tone]}`}>{label}</span>
        <span className="min-w-0 max-w-full tabular-nums [overflow-wrap:anywhere]">
          {value}/{max}
        </span>
      </div>
      <div className="mt-1 h-4 overflow-hidden border-2 border-night bg-night outline-2 outline-raised" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-valuetext={`${value} of ${max}`}>
        <div className={`h-full ${METER_FILL[tone]} shadow-[inset_0_2px_0_rgb(255_255_255/0.35)]`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm font-semibold text-hp-ink">
      {message}
    </p>
  )
}
