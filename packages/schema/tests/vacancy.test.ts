import { describe, it, expect } from 'vitest'
import { getVacancyTitle } from '../schemas/vacancy'

describe('getVacancyTitle', () => {
  it('should return "Company (Position)" when jobPosition is provided', () => {
    const vacancy = {
      company: 'Acme Corp',
      jobPosition: 'Senior Developer'
    }

    expect(getVacancyTitle(vacancy)).toBe('Acme Corp (Senior Developer)')
  })

  it('should return just "Company" when jobPosition is not provided', () => {
    const vacancy = {
      company: 'Acme Corp',
      jobPosition: undefined
    }

    expect(getVacancyTitle(vacancy)).toBe('Acme Corp')
  })

  it('should return just "Company" when jobPosition is empty string', () => {
    const vacancy = {
      company: 'Acme Corp',
      jobPosition: ''
    }

    expect(getVacancyTitle(vacancy)).toBe('Acme Corp')
  })

  it('should handle company names with special characters', () => {
    const vacancy = {
      company: 'Smith & Co.',
      jobPosition: 'UI/UX Designer'
    }

    expect(getVacancyTitle(vacancy)).toBe('Smith & Co. (UI/UX Designer)')
  })
})
