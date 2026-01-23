import { describe, expect, it } from 'vitest'
import { formatYYYYMM, isValidYYYYMM, parseYYYYMM } from '../helpers/date'

describe('isValidYYYYMM', () => {
  it('should validate correct YYYY-MM format', () => {
    expect(isValidYYYYMM('2026-01')).toBe(true)
    expect(isValidYYYYMM('2025-12')).toBe(true)
    expect(isValidYYYYMM('2000-06')).toBe(true)
  })

  it('should reject invalid month numbers', () => {
    expect(isValidYYYYMM('2026-00')).toBe(false)
    expect(isValidYYYYMM('2026-13')).toBe(false)
    expect(isValidYYYYMM('2026-99')).toBe(false)
  })

  it('should reject invalid year ranges', () => {
    expect(isValidYYYYMM('1899-01')).toBe(false)
    expect(isValidYYYYMM('2101-01')).toBe(false)
    expect(isValidYYYYMM('0000-01')).toBe(false)
  })

  it('should reject invalid formats', () => {
    expect(isValidYYYYMM('2026-1')).toBe(false) // Missing leading zero
    expect(isValidYYYYMM('26-01')).toBe(false) // Two-digit year
    expect(isValidYYYYMM('2026/01')).toBe(false) // Wrong separator
    expect(isValidYYYYMM('2026-01-15')).toBe(false) // Includes day
    expect(isValidYYYYMM('Jan 2026')).toBe(false) // Text format
    expect(isValidYYYYMM('')).toBe(false) // Empty string
  })
})

describe('parseYYYYMM', () => {
  it('should parse valid YYYY-MM to Date', () => {
    const date = parseYYYYMM('2026-01')
    expect(date).toBeInstanceOf(Date)
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(0) // January is 0
    expect(date?.getDate()).toBe(1)
  })

  it('should parse December correctly', () => {
    const date = parseYYYYMM('2025-12')
    expect(date?.getFullYear()).toBe(2025)
    expect(date?.getMonth()).toBe(11) // December is 11
  })

  it('should return null for invalid formats', () => {
    expect(parseYYYYMM('2026-13')).toBe(null)
    expect(parseYYYYMM('invalid')).toBe(null)
    expect(parseYYYYMM('2026-1')).toBe(null)
  })
})

describe('formatYYYYMM', () => {
  it('should format Date to YYYY-MM string', () => {
    const date = new Date(2026, 0, 15) // January 15, 2026
    expect(formatYYYYMM(date)).toBe('2026-01')
  })

  it('should format December correctly', () => {
    const date = new Date(2025, 11, 25) // December 25, 2025
    expect(formatYYYYMM(date)).toBe('2025-12')
  })

  it('should pad single-digit months with zero', () => {
    const date = new Date(2026, 5, 1) // June 1, 2026
    expect(formatYYYYMM(date)).toBe('2026-06')
  })

  it('should handle year boundaries correctly', () => {
    const date = new Date(2000, 0, 1)
    expect(formatYYYYMM(date)).toBe('2000-01')
  })
})
