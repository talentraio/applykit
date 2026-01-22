import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getDaysUntilExpiration, type Generation } from '../schemas/generation'

describe('getDaysUntilExpiration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('should return positive days for future dates', () => {
    const now = new Date('2026-01-22T12:00:00Z')
    vi.setSystemTime(now)

    const futureDate = new Date('2026-01-25T12:00:00Z')
    const generation: Generation = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      vacancyId: '123e4567-e89b-12d3-a456-426614174001',
      resumeId: '123e4567-e89b-12d3-a456-426614174002',
      content: {
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com',
        },
        experience: [],
        education: [],
        skills: [],
      },
      matchScoreBefore: 70,
      matchScoreAfter: 90,
      generatedAt: now,
      expiresAt: futureDate,
    }

    const days = getDaysUntilExpiration(generation)

    expect(days).toBe(3)
  })

  it('should return 0 for expired dates', () => {
    const now = new Date('2026-01-22T12:00:00Z')
    vi.setSystemTime(now)

    const pastDate = new Date('2026-01-20T12:00:00Z')
    const generation: Generation = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      vacancyId: '123e4567-e89b-12d3-a456-426614174001',
      resumeId: '123e4567-e89b-12d3-a456-426614174002',
      content: {
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com',
        },
        experience: [],
        education: [],
        skills: [],
      },
      matchScoreBefore: 70,
      matchScoreAfter: 90,
      generatedAt: new Date('2025-12-20T12:00:00Z'),
      expiresAt: pastDate,
    }

    const days = getDaysUntilExpiration(generation)

    expect(days).toBe(0)
  })

  it('should handle dates 90 days in the future', () => {
    const now = new Date('2026-01-22T12:00:00Z')
    vi.setSystemTime(now)

    const futureDate = new Date('2026-04-22T12:00:00Z')
    const generation: Generation = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      vacancyId: '123e4567-e89b-12d3-a456-426614174001',
      resumeId: '123e4567-e89b-12d3-a456-426614174002',
      content: {
        personalInfo: {
          fullName: 'John Doe',
          email: 'john@example.com',
        },
        experience: [],
        education: [],
        skills: [],
      },
      matchScoreBefore: 70,
      matchScoreAfter: 90,
      generatedAt: now,
      expiresAt: futureDate,
    }

    const days = getDaysUntilExpiration(generation)

    expect(days).toBe(90)
  })
})
