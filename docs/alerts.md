# Hero alerts: web push (P33)

Proposed 2026-10-09 for Barry's review and revised the same day with the open questions settled (see [Decisions taken in this revision](#decisions-taken-in-this-revision)); not approved, nothing built. This spec is the v1.1 "Web push/email alerts" stretch row in the [roadmap](roadmap.md): "Deferred by default; user opt-in, delivery cost and calmness review". Barry ruled out email on 2026-10-09, so alerts are **web push only**. Its companions are [quests](quests.md) (P31) and the [desk drawer](desk-drawer.md) (P32).

Source: the original brief listed "web push choice/merchant/death", to come later as an opt-in and never as an engagement requirement ([source brief](source-brief.md)). Desk Crawler is designed as a calm game on a calm device. The TRMNL screen is the notification surface, and [TRMNL experience](trmnl-experience.md) rules out urgency. Alerts therefore have to pass a stricter test than in most games: **an alert is sent only when the hero has stopped or is about to lose something, and the player can do something about it.**

## Which events qualify

| Event | Stopped or losing something? | Player can act? | Verdict |
| --- | --- | --- | --- |
| Hero asleep with a full bag and full desk drawer | Yes: no XP, no adventures until the player acts | Yes: sell, claim, resume | **Alert** |
| Merchant offering the next bag or pouch the hero can afford | Yes: the offer vanishes after four adventures (an hour), and a bag or pouch bought early is a real step on the ladder | Yes: buy | **Alert** |
| Merchant offering only potions | No: potions are a small convenience and the next visit sells them too | Yes | No alert: it would buzz a phone several times a day for nothing |
| Decision pending | No: the default resolves it after a day and play continues, and D79 promises a choice never needs intervention | Yes, but the default is fine | No alert: the game's own rule says nothing is waiting |
| Weekly keepsake waiting | No: it waits all week on the device | Yes | No alert: the keepsake exists to make people look at the TRMNL (D46), not a phone |
| Knocked out | Hero waits eight adventures and revives automatically | No | No alert |
| Raided | Gold and HP already moved | No | No alert (D110 already promises raids send no notifications) |
| Level up, rare find, rank change | No | No | No alert: celebrations belong on the device |

That gives two alert kinds: `asleep` and `merchant`. This catalog is the whole list. A new kind needs its own decision row and has to pass the same test.

## Why push only

Email is out (Barry, 2026-10-09). A push lands on the phone the player already uses for the companion, says one sentence and opens the right page with a tap. Email would add a sender address, deliverability and bounce handling, unsubscribe routes, a provider cost line and a privacy section, for an alert that arrives in a cluttered inbox and that the sleeping hero does not need to be read within the hour. The trade-off is reach: a player who never grants the browser permission, or who uses iOS Safari without a home-screen install, gets no alerts at all. The Settings card says so plainly, and the device remains the surface that always works.

## What a player sees

- **Settings → Alerts:** one card, off by default. "Get a nudge on this phone when your hero needs you" with an "Allow on this device" button that runs the browser permission prompt only after the player taps it, a list of enabled devices with Remove buttons, and two switches, each saying what it is and how often it can arrive:
  - "Hero asleep: the bag and drawer are full and adventures have stopped. Once per nap."
  - "Merchant deal: a bag or pouch you can afford is on sale for about an hour. At most once a day."
  - Quiet hours, on by default from 21:00 to 08:00 in the browser's timezone, editable in whole hours.
- **The alert itself:** short, in the game's voice, and it carries no data that would be a privacy problem on a lock screen: "Baz's bag is full and they've sat down for a nap. Make some room to send them back out." or "A merchant is selling Baz a Messenger Bag, and they have the gold. The offer lasts about an hour." Tapping opens the right companion page (Bag or Merchant).
- **Nothing on the device changes.**

## Rules

### Opt-in and consent

Every alert kind starts off. Turning one on is a receipted intent, `alerts.setPreferences`, and the companion never turns one on as a side effect of something else. Onboarding doesn't ask, and no banner or nag suggests alerts. The Settings card is the only way in, plus a single quiet link under the bag-full state on the hero page ("Want a nudge next time? Turn on alerts").

Push goes to each browser the player enabled. No email address is used or stored by this system.

### When an alert fires

The tick adapter already reads the owner's user row (`sim/runs/tick.ts`). Preferences live on that row, so checking them adds no read. When a tick's result contains a qualifying transition for a kind the owner has turned on, the adapter inserts one `alertOutbox` row in the same transaction:

- `asleep`: the hero's status became `sleeping` this tick. The row is keyed by `(heroId, 'asleep', sleepStartTick)`, so one nap means at most one alert.
- `merchant`: a merchant visit opened this tick **and** one of its offers is the next bag or pouch **and** the hero's gold after the tick covers that offer's price. Keyed by `(heroId, 'merchant', visitTick)`. Potion-only visits, and bag or pouch offers the hero can't afford yet, never create a row. Everything the rule needs (the offers, their prices, the hero's gold) is in the tick result, so the decision is made once, in the tick, like the D110 ledger.

The key is the row's identity, so a retried tick batch can't insert it twice.

### Delivery

A scheduled sender action drains the outbox in small batches (at most 50 rows a run, oldest first) and for each row:

1. **Rechecks that the alert still makes sense.** If the hero is no longer asleep, or the merchant has gone or the offer was bought, the row is marked `skipped`. An alert never tells the player something that's already over.
2. **Applies quiet hours.** During quiet hours, `asleep` waits until the window ends and then rechecks. `merchant` is dropped, because the visit is over by morning.
3. **Applies caps.** Each account gets at most 2 pushes per local day across both kinds, and at most 1 `merchant` push a day. Over a cap the row is `skipped`, with nothing queued for later.
4. **Waits before `asleep`.** The first attempt is 30 minutes after the nap starts, so a player who is already in the companion fixing the bag gets no alert. `merchant` sends at once, because the hour is the whole point.
5. **Sends** as Web Push (VAPID, aes128gcm) from a `"use node"` action using the `web-push` library, to each of the account's subscriptions. A 404 or 410 from the push service deletes that subscription. When an account's last subscription is gone, both switches turn off and Settings says why.
6. **Marks the row** `sent`, `skipped` or `failed`, with a reason code. Failures retry twice with backoff, then stop.

Outbox rows are deleted after 7 days. Local day and quiet hours use the IANA timezone the browser reports when the player saves preferences. That timezone is stored in the existing, currently unused `users.timezone` field ([companion](companion.md) keeps the legacy `setTimezone` for compatibility), so DST is handled by the timezone database rather than an offset.

### Push details

- The companion needs a service worker for push. Its scope is push only, with no offline caching, so it can't serve stale companion pages. The existing `manifest.webmanifest` (standalone, icons present) is enough for iOS, where web push works only after the player adds TRMNL Games to the home screen (iOS 16.4 and later). The Settings card detects iOS Safari outside standalone mode and says how to add the app instead of showing a button that can't work.
- A `pushSubscriptions` table holds the endpoint, keys, a user-agent label and the creation time. An account can have at most 5, and adding a sixth removes the oldest.
- The VAPID private key is a Convex server-only environment variable, and the public key is served to the companion.

### Cost

Web push is free: the browser vendors run the push services. The sender runs every 5 minutes only while the outbox has rows. When the outbox empties the sender stops scheduling itself, and the tick that inserts a row schedules it again, so an idle outbox costs nothing. The [operations](operations.md) cost model gains no line.

### Privacy and deletion

- The privacy policy gains a section covering which events can alert, that push subscriptions are stored per browser, and that they are deleted with the account.
- The deletion job removes preferences, push subscriptions and outbox rows for both deletion levels (D22): Desk Crawler removal deletes the game's alert rows, and account removal deletes everything.
- Analytics (consenting only, [analytics](analytics.md)): `alerts changed` with the kinds on, and `alert opened` with the kind, from the alert's link parameter. Never the endpoint.

## Deliberate limits

- Off by default with no nags. The only way in is Settings, plus the single link on the bag-full state.
- Push only. No email, SMS, Discord or TRMNL-side notification. The Discord bot stays a separate optional feature with its own bot authority.
- No alerts for decisions, celebrations, ranks, raids, knockouts, keepsakes or potion-only merchant visits.
- No digest or newsletter. A weekly summary would be a separate decision, and it fails the test because nothing is waiting on the player.
- Hard caps and quiet hours that the player can tighten but can't remove: the 2-push daily cap is fixed.

## Work slices

| Slice | Scope | Done when |
| --- | --- | --- |
| A1 Preferences and outbox | `users` alert preferences and timezone, `alerts.setPreferences` intent, outbox table with key, tick adapter insertion for both kinds including the affordable bag or pouch test, deletion coverage | A retried tick inserts each alert once (test); a potion-only visit and an unaffordable bag offer insert nothing (test); no extra reads per tick; deletion removes every alert row |
| A2 Web push for `asleep` | Service worker, VAPID keys, subscribe flow with iOS guidance, `pushSubscriptions`, sender action with recheck, quiet hours, caps and the 30-minute wait, push sending with stale-endpoint cleanup, privacy policy section | A real push arrives on Android Chrome and on an iOS home-screen install; rechecks skip a woken hero; a quiet-hours row sends at the window's end; a revoked permission removes the subscription; Barry receives a real test alert on the dev deployment |
| A3 `merchant` kind | Affordable bag or pouch rule in the adapter, immediate send, the once-a-day cap, quiet-hours drop | A potion-only visit never alerts (test); a bought offer is skipped at recheck |
| A4 Settings and help | Alerts card, device list, help section, analytics events | Phone previews pass at 390 wide |

The [desk drawer](desk-drawer.md) reduces how often `asleep` fires, so alerts are last in the suggested build order and tuned against the sleep that remains in production.

## Decisions taken in this revision

Barry asked on 2026-10-09 for the three stretch specs to be revised for the best gameplay, with the open questions settled rather than left for him, and then ruled out email.

1. **Push only, no email** (Barry, 2026-10-09). This removes the sender address, Resend cost line, unsubscribe route, bounce handling and the email half of the privacy section. The cost is reach for players without push permission, which the Settings card states.
2. **Two kinds, not three.** The `decision` alert is dropped: D79 promises a choice never needs a hand, so alerting on one contradicts the game's own rule and fails this spec's test. The catalog now reads "your hero stopped" and "a deal worth having is leaving".
3. **The merchant alert fires only for a bag or pouch the hero can afford.** Merchant visits are 6 of 100 loot draws, so an alert on every visit would be the noisiest thing in the game for a potion bundle. The filter makes every merchant push worth acting on and makes the once-a-day cap almost never bind.
4. **Daily cap of 2 pushes.** With two kinds, one of which is once per nap and the other once a day, more had no purpose. **The 30-minute `asleep` wait stays**: every tick asleep is a lost adventure, and the recheck already protects a player who is mid-fix.
