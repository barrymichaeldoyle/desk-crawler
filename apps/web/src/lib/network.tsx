import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'

const OnlineContext = createContext(true)
const subscribe = (notify: () => void) => {
  window.addEventListener('online', notify)
  window.addEventListener('offline', notify)
  return () => {
    window.removeEventListener('online', notify)
    window.removeEventListener('offline', notify)
  }
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
  return <OnlineContext.Provider value={online}>{children}</OnlineContext.Provider>
}

export const useOnline = () => useContext(OnlineContext)

export function OfflineNote() {
  const online = useOnline()
  return online ? null : (
    <p role="status" className="border-b border-rule px-4 py-3 text-center text-sm">
      You're offline. Showing the last available update. Reconnect to make changes; actions aren't queued.
    </p>
  )
}
