import { customAlphabet } from 'nanoid'

// Create a custom alphabet that's URL-safe and readable
const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'

// Generate a 10-character short ID
export const generateShortId = customAlphabet(alphabet, 10)

/**
 * Generate a short ID for a tracking link
 * This creates a 10-character, URL-safe, non-guessable identifier
 */
export function createTrackingLinkId(): string {
  return generateShortId()
}

/**
 * Validate that a short ID follows the expected format
 */
export function isValidShortId(id: string): boolean {
  // Check length and character set
  if (id.length !== 10) return false
  
  // Check that all characters are in our alphabet
  for (const char of id) {
    if (!alphabet.includes(char)) return false
  }
  
  return true
}

/**
 * Generate a click ID for tracking
 */
export function generateClickTrackingId(): string {
  return `click_${Date.now()}_${generateShortId()}`
}

/**
 * Generate a session ID
 */
export function generateSessionId(): string {
  return `sess_${Date.now()}_${generateShortId()}`
}
