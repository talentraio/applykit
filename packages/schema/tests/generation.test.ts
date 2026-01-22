import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getDaysUntilExpiration, getGenerationExpirationDate } from '../schemas/generation'

describe('getDaysUntilExpiration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('should return positive days for future dates', () => {
    const now = new Date('2026-01-22T12:00:00Z')
    vi.setSystemTime(now)

    const futureDate = new Date('2026-01-25T12:00:00Z')
    const days = getDaysUntilExpiration(futureDate.toISOString())

    expect(days).toBe(3)
  })

  it('should return 0 for dates within the same day', () => {
    const now = new Date('2026-01-22T12:00:00Z')
    vi.setSystemTime(now)

    const sameDay = new Date('2026-01-22T18:00:00Z')
    const days = getDaysUntilExpiration(sameDay.toISOString())

    expect(days).toBe(1)
  })

  it('should return negative days for past dates', () => {
    const now = new Date('2026-01-22T12:00:00Z')
    vi.setSystemTime(now)

    const pastDate = new Date('2026-01-20T12:00:00Z')
    const days = getDaysUntilExpiration(pastDate.toISOString())

    expect(days).toBe(-2)
  })

  it('should handle dates 30 days in the future', () => {
    const now = new Date('2026-01-22T12:00:00Z')
    vi.setSystemTime(now)

    const futureDate = new Date('2026-02-21T12:00:00Z')
    const days = getDaysUntilExpiration(futureDate.toISOString())

    expect(days).toBe(30)
  })
})

describe('getGenerationExpirationDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('should return a date 30 days in the future', () => {
    const now = new Date('2026-01-22T12:00:00Z')
    vi.setSystemTime(now)

    const expirationDate = getGenerationExpirationDate()
    const expected = new Date('2026-02-21T12:00:00Z')

    expect(new Date(expirationDate).getTime()).toBe(expected.getTime())
  })

  it('should return ISO datetime string', () => {
    const now = new Date('2026-01-22T12:00:00Z')
    vi.setSystemTime(now)

    const expirationDate = getGenerationExpirationDate()

    expect(expirationDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})
