/**
 * Date format validation and parsing helpers
 */

const YYYY_MM_REGEX = /^\d{4}-(?:0[1-9]|1[0-2])$/

/**
 * Validate YYYY-MM date format
 * @param date Date string in YYYY-MM format
 * @returns true if valid, false otherwise
 */
export function isValidYYYYMM(date: string): boolean {
  if (!YYYY_MM_REGEX.test(date)) {
    return false
  }

  const [year] = date.split('-').map(Number)

  // Check year is reasonable (1900-2100)
  if (year < 1900 || year > 2100) {
    return false
  }

  // Month is already validated by regex (01-12)
  return true
}

/**
 * Parse YYYY-MM date string to Date object (first day of month)
 */
export function parseYYYYMM(date: string): Date | null {
  if (!isValidYYYYMM(date)) {
    return null
  }

  const [year, month] = date.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

/**
 * Format Date object to YYYY-MM string
 */
export function formatYYYYMM(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}
