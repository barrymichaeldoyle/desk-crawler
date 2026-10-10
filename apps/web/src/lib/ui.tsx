import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { useOnline } from './network'
import { Glyph, type GlyphName } from './glyphs'

/**
 * The gold menu choice: shared by Button and links styled as the primary action. A press sinks the key two pixels
 * into its lip, so a tap answers on the spot before the server does.
 */
export const BUTTON_PRIMARY = 'hud text-hud-sm border-[3px] border-night bg-gold text-night shadow-[inset_0_-4px_0_var(--color-gold-lo)] hover:bg-gold-hi active:translate-y-0.5 active:shadow-[inset_0_-2px_0_var(--color-gold-lo)]'
/** The cream-edged alternative, for links that act like a secondary button; a press inverts it. */
export const BUTTON_SECONDARY = 'hud text-hud-sm border-[3px] border-edge text-ink hover:bg-ink hover:text-night active:bg-ink active:text-night'
/** Layout for a Link that wears a button style. */
export const LINK_BUTTON = 'inline-flex min-h-11 items-center px-4 py-2 no-underline'

export function Button({ variant = 'primary', className = '', pending = false, busyLabel = 'Working…', allowOffline = false, icon, children, disabled, onClick, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; pending?: boolean; busyLabel?: string; allowOffline?: boolean; icon?: GlyphName }) {
  const online = useOnline()
  const styles = {
    primary: BUTTON_PRIMARY,
    secondary: BUTTON_SECONDARY,
    quiet: 'font-semibold text-muted underline underline-offset-4 hover:text-ink active:text-ink',
    danger: 'hud text-hud-sm border-[3px] border-hp text-hp-ink hover:bg-hp hover:text-night active:bg-hp active:text-night',
  }[variant]
  // A busy button stays focusable (aria-disabled, clicks swallowed): disabling it would drop keyboard focus to the page.
  return <button type="button" {...props} aria-busy={pending || undefined} aria-disabled={pending || undefined} disabled={!pending && (disabled || (!online && !allowOffline))} onClick={(event) => { if (pending) { event.preventDefault(); return } onClick?.(event) }} className={`min-h-11 px-3 py-2 min-[375px]:px-4 ${icon ? 'inline-flex items-center justify-center gap-2.5' : ''} ${styles} disabled:cursor-not-allowed disabled:border-dashed disabled:border-faint disabled:bg-transparent disabled:text-muted disabled:shadow-none disabled:no-underline disabled:active:translate-y-0 aria-busy:cursor-wait aria-busy:active:translate-y-0 ${className}`}>{icon ? <Glyph name={icon} className={pending ? 'invisible' : ''} /> : null}{pending ? busyLabel : children}</button>
}

/**
 * Keeps keyboard focus inside a group of commands when the focused control leaves the page, as Pause does when it
 * swaps for Resume: once `swap` changes, focus that fell to the page moves to the group's first live control.
 */
export function useFocusWithin<T extends HTMLElement>(swap: unknown) {
  const ref = useRef<T>(null)
  const inside = useRef(false)
  // Listened for on the document, so a group that mounts after a loading state is still seen. A removed control blurs
  // without focusing anything else, so only focus landing somewhere outside the group clears the flag.
  useEffect(() => {
    const track = (event: FocusEvent) => { inside.current = event.target instanceof Node && Boolean(ref.current?.contains(event.target)) }
    document.addEventListener('focusin', track)
    return () => document.removeEventListener('focusin', track)
  }, [])
  useEffect(() => {
    const active = document.activeElement
    if (!inside.current || (active && active !== document.body && active.isConnected)) return
    ref.current?.querySelector<HTMLElement>('button:not([disabled]), a[href]')?.focus()
  }, [swap])
  return ref
}

/**
 * Counts the times `value` has grown since the page opened, for one-shot gain animations: a component keys its animated
 * element by the count, so the animation replays on each gain and never runs on load or on a loss.
 */
export function useGains(value: number): number {
  const last = useRef(value)
  const [gains, setGains] = useState(0)
  useEffect(() => {
    if (value > last.current) setGains((count) => count + 1)
    last.current = value
  }, [value])
  return gains
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
    <div className={`pointer-events-none fixed inset-x-0 z-30 flex flex-col items-center px-4 ${lifted ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]' : 'bottom-[calc(1rem+env(safe-area-inset-bottom))]'}`}>
      {/* Real boxes, not display: contents, which some browsers drop from the accessibility tree; stacked, an empty one takes no space. */}
      <div role="status" aria-live="polite" className="flex w-full max-w-md">{notice?.kind === 'ok' ? <NoticePanel key={notice.key} text={text} tone="text-xp-ink" onDismiss={onDismiss} /> : null}</div>
      <div role="alert" className="flex w-full max-w-md">{notice?.kind === 'error' ? <NoticePanel key={notice.key} text={text} tone="text-hp-ink" onDismiss={onDismiss} /> : null}</div>
    </div>
  )
}

function NoticePanel({ text, tone, onDismiss }: { text: string; tone: string; onDismiss: () => void }) {
  return <div className="window notice-rise pointer-events-auto flex w-full max-w-md items-center gap-3 px-4 py-2 text-sm">
    <p className={`min-w-0 flex-1 font-semibold ${tone}`}>{text}</p>
    <button type="button" aria-label="Dismiss" onClick={onDismiss} className="hud text-hud-sm flex size-11 shrink-0 items-center justify-center text-muted hover:text-ink active:text-ink">×</button>
  </div>
}

export function Card({ title, icon, children, className = '' }: { title?: string; icon?: GlyphName; children: ReactNode; className?: string }) {
  const id = useId()
  return (
    <section aria-labelledby={title ? id : undefined} className={`window min-w-0 px-3 pt-3 pb-4 min-[375px]:px-4 sm:px-5 ${className}`}>
      {title ? icon ? <h2 id={id} className="mb-3 flex items-center gap-3 font-display text-2xl font-bold"><Glyph name={icon} size={24} className="text-gold-ink" /><span className="min-w-0">{title}</span></h2> : <h2 id={id} className="mb-3 font-display text-2xl font-bold">{title}</h2> : null}
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

export function ErrorNote({ message, id }: { message: string | null; id?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="text-sm font-semibold text-hp-ink">
      {message}
    </p>
  )
}
