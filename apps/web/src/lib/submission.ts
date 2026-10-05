/** Matches the backend's 24-hour receipt horizon. No offline commands are queued. */
const RECEIPT_TTL_MS = 24 * 60 * 60 * 1000

export class ExpiredSubmission extends Error {
  constructor() {
    super('That action could not be confirmed and is too old to retry safely. Check the current state before choosing an action again.')
  }
}

/** Immediate double-click guard, and receipt reuse after an unknown outcome. */
export class Submission {
  private busy = false
  private uncertain = new Map<string, { id: string; at: number }>()

  async run<T extends object>(args: T, submit: (input: T & { operationId: string }) => Promise<unknown>, isDefiniteFailure: (error: unknown) => boolean): Promise<boolean> {
    if (this.busy) return false
    const key = JSON.stringify(args)
    const previous = this.uncertain.get(key)
    const now = Date.now()
    if (previous && now - previous.at >= RECEIPT_TTL_MS) {
      this.uncertain.delete(key)
      throw new ExpiredSubmission()
    }
    const operation = previous ?? { id: crypto.randomUUID(), at: now }
    this.busy = true
    try {
      await submit({ ...args, operationId: operation.id })
      this.uncertain.delete(key)
      return true
    } catch (error) {
      if (isDefiniteFailure(error)) this.uncertain.delete(key)
      else this.uncertain.set(key, operation)
      throw error
    } finally {
      this.busy = false
    }
  }
}
