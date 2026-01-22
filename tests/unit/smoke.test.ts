import { describe, it, expect } from 'vitest'

describe('Smoke test', () => {
  it('should pass basic assertion', () => {
    expect(true).toBe(true)
  })

  it('should handle basic math', () => {
    expect(1 + 1).toBe(2)
  })

  it('should verify test environment is working', () => {
    const testValue = 'vitest'
    expect(testValue).toBeDefined()
    expect(testValue).toBe('vitest')
  })
})
