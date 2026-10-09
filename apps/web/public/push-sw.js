// P33 hero alerts: push only. No fetch handler and no caching, so this worker never serves a stale companion page.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }
  const title = typeof data.title === 'string' ? data.title : 'Desk Crawler'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === 'string' ? data.body : '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: typeof data.tag === 'string' ? data.tag : undefined,
      data: { url: typeof data.url === 'string' ? data.url : '/app/desk-crawler' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url ?? '/app/desk-crawler', self.location.origin)
  // Only ever open this site's own pages.
  if (target.origin !== self.location.origin) return
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) {
        if (new URL(client.url).origin !== target.origin) continue
        try {
          const navigated = await client.navigate(target.href)
          return await (navigated ?? client).focus()
        } catch {
          // An uncontrolled window cannot be navigated from here; open a fresh one instead.
        }
      }
      return await self.clients.openWindow(target.href)
    })(),
  )
})
