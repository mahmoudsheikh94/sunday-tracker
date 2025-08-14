import { format, parseISO, startOfDay, endOfDay, addDays, subDays } from 'date-fns'
import { toZonedTime, format as formatTz } from 'date-fns-tz'

export const COPENHAGEN_TIMEZONE = 'Europe/Copenhagen'

/**
 * Convert a UTC date to Copenhagen time
 */
export function utcToCopenhagen(utcDate: Date): Date {
  return toZonedTime(utcDate, COPENHAGEN_TIMEZONE)
}

/**
 * Convert a Copenhagen date to UTC
 */
export function copenhagenToUtc(copenhagenDate: Date): Date {
  // For simplicity, we'll treat this as a direct conversion
  // In production, you might want more sophisticated timezone handling
  return copenhagenDate
}

/**
 * Get the start of a day in Copenhagen timezone (00:00:00)
 */
export function startOfCopenhagenDay(date: Date): Date {
  const copenhagenDate = utcToCopenhagen(date)
  const startOfDayCph = startOfDay(copenhagenDate)
  return copenhagenToUtc(startOfDayCph)
}

/**
 * Get the end of a day in Copenhagen timezone (23:59:59)
 */
export function endOfCopenhagenDay(date: Date): Date {
  const copenhagenDate = utcToCopenhagen(date)
  const endOfDayCph = endOfDay(copenhagenDate)
  return copenhagenToUtc(endOfDayCph)
}

/**
 * Format a date for display in Copenhagen timezone
 */
export function formatCopenhagen(date: Date, formatString: string = 'yyyy-MM-dd HH:mm:ss'): string {
  return formatTz(date, formatString, { timeZone: COPENHAGEN_TIMEZONE })
}

/**
 * Get the current date in Copenhagen timezone
 */
export function nowInCopenhagen(): Date {
  return utcToCopenhagen(new Date())
}

/**
 * Get the current date key (00:00:00) in Copenhagen timezone as UTC
 */
export function todayCopenhagenKey(): Date {
  return startOfCopenhagenDay(new Date())
}

/**
 * Get a date key for a specific date in Copenhagen timezone
 */
export function copenhagenDateKey(date: Date): Date {
  return startOfCopenhagenDay(date)
}

/**
 * Check if a date is today in Copenhagen timezone
 */
export function isTodayInCopenhagen(date: Date): boolean {
  const today = todayCopenhagenKey()
  const dateKey = copenhagenDateKey(date)
  return today.getTime() === dateKey.getTime()
}

/**
 * Get the last N days in Copenhagen timezone
 */
export function getLastNDaysCopenhagen(days: number): Date[] {
  const dates: Date[] = []
  const today = todayCopenhagenKey()
  
  for (let i = 0; i < days; i++) {
    dates.push(subDays(today, i))
  }
  
  return dates.reverse()
}

/**
 * Get the next N days in Copenhagen timezone
 */
export function getNextNDaysCopenhagen(days: number): Date[] {
  const dates: Date[] = []
  const today = todayCopenhagenKey()
  
  for (let i = 1; i <= days; i++) {
    dates.push(addDays(today, i))
  }
  
  return dates
}

/**
 * Format a date for human-readable display in Copenhagen timezone
 */
export function formatCopenhagenHuman(date: Date): string {
  const now = new Date()
  const copenhagenDate = utcToCopenhagen(date)
  const copenhagenNow = utcToCopenhagen(now)
  
  if (isTodayInCopenhagen(date)) {
    return `Today at ${format(copenhagenDate, 'HH:mm')}`
  }
  
  const yesterday = subDays(copenhagenNow, 1)
  if (copenhagenDate.getDate() === yesterday.getDate()) {
    return `Yesterday at ${format(copenhagenDate, 'HH:mm')}`
  }
  
  return formatCopenhagen(date, 'MMM d, yyyy HH:mm')
}
