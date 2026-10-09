# Error reporting (D113)

Barry asked on 2026-10-09 for Sentry to be set up for TRMNL Games. Sentry project **trmnl-games** (id 4512227006808064) lives in the existing `barry-michael-doyle` organization, US region. PostHog (D67, [analytics](analytics.md)) stays the place for consented events, browser errors linked to a support profile, and masked recordings. Sentry adds what PostHog cannot see: uncaught errors on the Worker, with stack traces grouped into issues.

## What reports and when

| Source | Captured | Gate |
| --- | --- | --- |
| Worker (`apps/web/src/server.ts`) | Uncaught errors in a request, wrapped by `withSentry` from `@sentry/cloudflare`, which is wrangler's `main` | Every production request; `enabled` only in a production build |
| Request and server-function middleware (`apps/web/src/start.ts`) | Errors thrown by any request middleware, route handler or server function, reported and rethrown unchanged | Same as the Worker. Server functions return expected failures (expired install, signed out) as results, so only faults throw |
| Browser (`apps/web/src/lib/errorReporting.ts`) | Unhandled errors and rejections, plus the errors the app catches itself: the route error screen, a failed game intent, a failed installation (`reportError`, which also sends them to PostHog) | Only after **Allow analytics**, only on `https://trmnlgames.com` in a production build. The SDK loads on demand (a 90 kB chunk), so declining players never download it, and every event checks consent again so withdrawal stops reports at once |

Convex functions are not covered. Convex's own exception reporting integration (dashboard, Pro plan) can forward them to the same project if wanted later.

## Privacy boundary

Reports carry no person. `dataCollection` turns off user info, cookies, headers, bodies, query strings and stack-frame variables, and there is no `user` context. `scrubSentryEvent` (`apps/web/src/lib/sentry.ts`) then runs on the Worker and in the browser:

- drops any event whose request URL is not on `https://trmnlgames.com`, so development, `vite preview` and other hosts never send;
- keeps only the request method and `origin + path`;
- deletes `user` and `server_name`;
- runs the analytics scrubber over the message, exception values, breadcrumbs, `extra`, tags and transaction, which strips URL query strings and hashes, `code=`, `jwt=`, `token=`, `installation_callback_url=` and similar pairs, and JWT-shaped strings.

The project also has server-side scrubbing: Sentry's default data scrubber, IP address scrubbing, and the sensitive fields `code`, `jwt`, `token`, `access_token`, `installation_callback_url`, `callbackUrl`, `tokenIdentifier` and `tokenHash`. No session replay, no release-health sessions (`BrowserSession` is removed, so the browser sends nothing unless an error happens) and no tracing (no `tracesSampleRate`, so no trace headers reach Convex or Clerk).

Because nothing links a report to an account, account deletion has nothing to erase in Sentry; reports age out with the plan's retention (90 days at most). The privacy page names Sentry as a US service and says so. `tests/web/sentry.test.ts` covers the boundary.

## Releases and source maps

Both SDKs report `release` as the build id: the commit Workers Builds deploys (`WORKERS_CI_COMMIT_SHA`), the same id `/build.json` publishes. When the build has `SENTRY_AUTH_TOKEN`, `sentryTanstackStart` from `@sentry/tanstackstart-react/vite` generates hidden source maps, uploads them for that release and deletes the `.map` files, so neither the site nor the Worker serves them. Without the token (local builds) the plugin is left out and the build is unchanged. The token is a Sentry organization auth token with release upload scope, set as a build variable on the Workers Builds trigger, not as a runtime secret. Configured on 2026-10-09: organization token "trmnl-games Workers Builds source maps" (scope `org:ci`), stored as the encrypted build secret `SENTRY_AUTH_TOKEN`. The first build with it (da6c601, retried from the dashboard) uploaded two debug-ID bundles (182 client and 138 server files) and created the release; the live JavaScript carries `_sentryDebugIds` and `.map` URLs return 404.

## Working with it

```bash
sentry issue list barry-michael-doyle/trmnl-games --query "is:unresolved"
sentry issue view TRMNL-GAMES-1 --json --fields shortId,title,culprit,count,permalink
```

The DSN is public (it can only submit events) and lives in `apps/web/src/lib/sentry.ts`. To pause reporting, set `enabled: false` in `sentryOptions` and deploy.
