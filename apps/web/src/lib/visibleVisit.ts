type VisibilitySource = Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>

/** Acknowledge a visit only after two uninterrupted seconds in a visible tab. */
export function afterVisibleVisit(callback: () => void, source: VisibilitySource = document): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  const schedule = () => {
    clearTimeout(timer)
    timer = undefined
    if (source.visibilityState === 'visible') timer = setTimeout(() => {
      timer = undefined
      if (source.visibilityState === 'visible') callback()
    }, 2000)
  }
  source.addEventListener('visibilitychange', schedule)
  schedule()
  return () => {
    clearTimeout(timer)
    source.removeEventListener('visibilitychange', schedule)
  }
}
