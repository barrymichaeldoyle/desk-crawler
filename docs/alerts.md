# Hero alerts: web push and email (P33)

Proposed 2026-10-09 for Barry's review; not approved, nothing built. This spec is the v1.1 "Web push/email alerts" stretch row in the [roadmap](roadmap.md): "Deferred by default; user opt-in, delivery cost and calmness review". Its companions are [quests](quests.md) (P31) and [lost-and-found](lost-and-found.md) (P32).

Source: the original brief listed "web push choice/merchant/death", to come later as an opt-in and never as an engagement requirement ([source brief](source-brief.md)). Desk Crawler is designed as a calm game on a calm device. The TRMNL screen is the notification surface, and [TRMNL experience](trmnl-experience.md) rules out urgency. Alerts therefore have to pass a stricter test than in most games: **an alert is sent only when the hero has stopped or is about to lose something, and the player can do something about it.**

## Which events qualify

| Event | Stopped or losing something? | Player can act? | Verdict |
| --- | --- | --- | --- |
| Hero asleep with a full bag (or full lost-and-found box) | Yes: no XP, no adventures until the player acts | Yes: sell, claim, resume | **Alert** |
| Merchant visiting | Offers vanish after four adventures (an hour) | Yes: buy | **Alert, push only**, since email is too slow for an hour |
| Decision pending | No: the default resolves it after a day and play continues | Yes, but the default is fine | **Alert, off unless chosen**, at most one per day |
| Weekly keepsake waiting | No: it waits all week on the device | Yes | No alert: the keepsake exists to make people look at the TRMNL (D46), not a phone |
| Knocked out | Hero waits eight adventures and revives automatically | No | No alert |
| Raided | Gold and HP already moved | No | No alert (D110 already promises raids send no notifications) |
| Level up, rare find, rank change | No | No | No alert: celebrations belong on the device |

That gives three alert kinds: `asleep`, `merchant` and `decision`. This catalog is the whole list. A new kind needs its own decision row and has to pass the same test.

## What a player sees

- **Settings → Alerts:** one card, off by default. "Get a nudge when your hero needs you" with three switches, each saying what it is and how often it can arrive:
  - "Hero asleep: the bag is full and adventures have stopped. Once per nap." (email and/or push)
  - "Merchant visiting: offers last about an hour. At most twice a day." (push)
  - "Decision waiting: your hero will pick a default after a day if you don't. At most once a day." (push)
  - Quiet hours, on by default from 21:00 to 08:00 in the browser's timezone, editable in whole hours.
  - For push, an "Allow on this device" button that runs the browser permission prompt only after the player taps it, plus a list of enabled devices with Remove buttons.
- **The alert itself:** short, in the game's voice, and it carries no data that would be a privacy problem on a lock screen: "Baz's bag is full and they've sat down for a nap. Make some room to send them back out." Tapping opens the right companion page (Bag, Merchant or Decision). Emails carry the same text with one button and a one-click unsubscribe.
- **Nothing on the device changes.**

## Rules

### Opt-in and consent

Every alert kind starts off. Turning one on is a receipted intent, `alerts.setPreferences`, and the companion never turns one on as a side effect of something else. Onboarding doesn't ask, and no banner or nag suggests alerts. The Settings card is the only way in, plus a single quiet link under the bag-full state on the hero page ("Want a nudge next time? Turn on alerts").

Email goes to the account's verified Clerk email, the address feedback replies already use (D107). Push goes to each browser the player enabled.

### When an alert fires

The tick adapter already reads the owner's user row (`sim/runs/tick.ts`). Preferences live on that row, so checking them adds no read. When a tick's result contains a qualifying transition for a kind the owner has turned on, the adapter inserts one `alertOutbox` row in the same transaction:

- `asleep`: the hero's status became `sleeping` this tick. The row is keyed by `(heroId, 'asleep', sleepStartTick)`, so one nap means at most one alert.
- `merchant`: a merchant visit opened this tick, keyed by `(heroId, 'merchant', visitTick)`.
- `decision`: a choice was offered this tick, keyed by `(heroId, 'decision', offeredAtTick)`.

The key is the row's identity, so a retried tick batch can't insert it twice. Like the D110 ledger, the alert is decided once inside the tick that caused it.

### Delivery

A scheduled sender action drains the outbox in small batches (at most 50 rows a run, oldest first) and for each row:

1. **Rechecks that the alert still makes sense.** If the hero is no longer asleep, the merchant has gone or the decision is resolved, the row is marked `skipped`. An alert never tells the player something that's already over.
2. **Applies quiet hours.** During quiet hours, `asleep` and `decision` wait until the window ends and then recheck. `merchant` is dropped, because the visit is over by morning.
3. **Applies caps.** Each account gets at most 3 pushes and 1 email per local day across every kind, and at most 2 `merchant` pushes a day. Over a cap the row is `skipped`, with nothing queued for later.
4. **Waits before `asleep`.** The first attempt is 30 minutes after the nap starts, so a player who is already in the companion fixing the bag gets no alert.
5. **Sends.** Email goes through Resend with an `Idempotency-Key` of the outbox id, as feedback already does. Push goes as Web Push (VAPID, aes128gcm) from a `"use node"` action using the `web-push` library, to each of the account's subscriptions. A 404 or 410 from the push service deletes that subscription.
6. **Marks the row** `sent`, `skipped` or `failed`, with a reason code. Failures retry twice with backoff, then stop.

Outbox rows are deleted after 7 days. Local day and quiet hours use the IANA timezone the browser reports when the player saves preferences. That timezone is stored in the existing, currently unused `users.timezone` field ([companion](companion.md) keeps the legacy `setTimezone` for compatibility), so DST is handled by the timezone database rather than an offset.

### Email details

- Sent from `Desk Crawler <heroes@trmnlgames.com>` on the already Resend-verified `trmnlgames.com` domain. The D27 incident mail keeps `alerts@`, so player mail and Barry's incident mail never share an address.
- Every email has `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058), pointing at an HTTP route with a signed token that turns off that kind for that account without a sign-in. A footer link does the same, plus "Manage alerts".
- Plain layout: game sprite, two sentences, one button. No tracking pixels or link rewriting.
- If Resend reports a hard bounce or complaint, the account's email alerts are turned off, and Settings says so.

### Push details

- The companion needs a service worker for push. Its scope is push only, with no offline caching, so it can't serve stale companion pages. The existing `manifest.webmanifest` (standalone, icons present) is enough for iOS, where web push works only after the player adds TRMNL Games to the home screen (iOS 16.4 and later). The Settings card detects iOS Safari outside standalone mode and says how to add the app instead of showing a button that can't work.
- A `pushSubscriptions` table holds the endpoint, keys, a user-agent label and the creation time. An account can have at most 5, and adding a sixth removes the oldest.
- The VAPID private key is a Convex server-only environment variable, and the public key is served to the companion.

### Cost

Resend's free tier is 3,000 emails a month and 100 a day. With the email cap at one per account per day and only `asleep` sending email, the free tier covers about 100 opted-in accounts on a bad day. Web push is free. The sender runs every 5 minutes only while the outbox has rows. When the outbox empties the sender stops scheduling itself, and the tick that inserts a row schedules it again, so an idle outbox costs nothing. If opted-in accounts pass 60, the [operations](operations.md) cost model gains a line for the Resend paid tier, which is $20 a month for 50,000.

### Privacy and deletion

- The privacy policy gains a section covering which events can alert, that email uses the account email, that push subscriptions are stored per browser, and that both are deleted with the account.
- The deletion job removes preferences, push subscriptions and outbox rows for both deletion levels (D22): Desk Crawler removal deletes the game's alert rows, and account removal deletes everything.
- Analytics (consenting only, [analytics](analytics.md)): `alerts changed` with the kinds on and the channel, and `alert opened` with the kind, from the alert's link parameter. Never the email address or endpoint.

## Deliberate limits

- Off by default with no nags. The only way in is Settings, plus the single link on the bag-full state.
- No alerts for celebrations, ranks, raids, knockouts or keepsakes.
- No digest or newsletter. A weekly summary email would be a separate decision, and it fails the test because nothing is waiting on the player.
- No SMS, Discord or TRMNL-side notification. The Discord bot stays a separate optional feature with its own bot authority.
- Hard caps and quiet hours that the player can tighten but can't remove: the 3-push and 1-email daily caps are fixed.

## Work slices

| Slice | Scope | Done when |
| --- | --- | --- |
| A1 Preferences and outbox | `users` alert preferences and timezone, `alerts.setPreferences` intent, outbox table with key, tick adapter insertion for the three kinds, deletion coverage | A retried tick inserts each alert once (test); no extra reads per tick; deletion removes every alert row |
| A2 Email for `asleep` | Sender action with recheck, quiet hours, caps, 30-minute wait; Resend send with idempotency; unsubscribe route with signed token; bounce handling via the Resend webhook; privacy policy section | Rechecks skip a woken hero; a quiet-hours row sends at the window's end; one-click unsubscribe works without sign-in; Barry receives a real test alert on the dev deployment |
| A3 Web push | Service worker, VAPID keys, subscribe flow with iOS guidance, `pushSubscriptions`, push sending with stale-endpoint cleanup, `merchant` and `decision` kinds | A real push arrives on Android Chrome and on an iOS home-screen install; a revoked permission removes the subscription |
| A4 Settings and help | Alerts card, device list, help section, analytics events | Phone previews pass at 390 wide |

A2 ships before A3 because email needs no browser work and covers the alert that matters most. [Lost-and-found](lost-and-found.md) reduces how often `asleep` fires, so if both are approved, the box ships first and alerts are tuned against what is left.

## Questions for Barry

1. Are three kinds right? `decision` is the weakest, since the default is fine. Dropping it keeps the catalog to "your hero stopped" and "a deal is leaving".
2. Is `heroes@trmnlgames.com` fine as the sender? The domain is already verified for D27, so it needs no DNS change.
3. Is a 30-minute wait before the `asleep` alert right? Longer is calmer, and shorter gets the hero moving sooner.
