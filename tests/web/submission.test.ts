import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExpiredSubmission, Submission } from '../../apps/web/src/lib/submission'

afterEach(() => vi.useRealTimers())

describe('companion action submissions', () => {
  it('blocks simultaneous clicks before a React render can disable the control', async () => {
    const operation = new Submission()
    let finish!: () => void
    const submit = vi.fn(() => new Promise<void>((resolve) => { finish = resolve }))
    const first = operation.run({}, submit, () => false)
    expect(await operation.run({}, submit, () => false)).toBe(false)
    expect(submit).toHaveBeenCalledTimes(1)
    finish()
    expect(await first).toBe(true)
  })

  it('reuses the operation ID and original arguments after an unknown sale outcome', async () => {
    const operation = new Submission()
    const submit = vi.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValue({})
    const args = { itemIds: ['one', 'two'] }
    await expect(operation.run(args, submit, () => false)).rejects.toThrow('Connection lost')
    expect(await operation.run(args, submit, () => false)).toBe(true)
    expect(submit.mock.calls[1]![0]).toEqual(submit.mock.calls[0]![0])
    await operation.run(args, submit, () => false)
    expect(submit.mock.calls[2]![0].operationId).not.toBe(submit.mock.calls[0]![0].operationId)
  })

  it('does not reuse a receipt after a definitive rejection', async () => {
    const operation = new Submission()
    const submit = vi.fn().mockRejectedValueOnce(new Error('No potion')).mockResolvedValue({})
    await expect(operation.run({}, submit, () => true)).rejects.toThrow()
    await operation.run({}, submit, () => true)
    expect(submit.mock.calls[1]![0].operationId).not.toBe(submit.mock.calls[0]![0].operationId)
  })

  it('refuses an unknown-outcome retry after the backend receipt expires', async () => {
    vi.useFakeTimers()
    const operation = new Submission()
    const submit = vi.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValue({})
    await expect(operation.run({}, submit, () => false)).rejects.toThrow()
    vi.advanceTimersByTime(24 * 60 * 60 * 1000)
    await expect(operation.run({}, submit, () => false)).rejects.toBeInstanceOf(ExpiredSubmission)
    expect(submit).toHaveBeenCalledTimes(1)
    // A further deliberate action is allowed after the user has been told to check current state.
    await operation.run({}, submit, () => false)
    expect(submit.mock.calls[1]![0].operationId).not.toBe(submit.mock.calls[0]![0].operationId)
  })
})
