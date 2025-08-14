import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const CLICK_COOKIE_NAME = 'sndy_click_id'
export const CLICK_COOKIE_EXPIRY_DAYS = 45

/**
 * Generate a unique click ID
 */
export function generateClickTrackingId(): string {
  return `click_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get the click ID from cookies
 */
export async function getClickId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(CLICK_COOKIE_NAME)?.value || null
}

/**
 * Set the click ID cookie
 */
export function setClickCookie(response: NextResponse, clickId: string): void {
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + CLICK_COOKIE_EXPIRY_DAYS)
  
  response.cookies.set(CLICK_COOKIE_NAME, clickId, {
    expires: expiryDate,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  })
}

/**
 * Set the click ID cookie in a request context
 */
export function setClickCookieInRequest(request: NextRequest, clickId: string): NextResponse {
  const response = NextResponse.next()
  setClickCookie(response, clickId)
  return response
}

/**
 * Extract UTM parameters from a request
 */
export function extractUtmParams(request: NextRequest): Record<string, string> {
  const url = new URL(request.url)
  const utmParams: Record<string, string> = {}
  
  // Common UTM parameters
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
  
  for (const key of utmKeys) {
    const value = url.searchParams.get(key)
    if (value) {
      utmParams[key] = value
    }
  }
  
  return utmParams
}

/**
 * Hash IP address for privacy (optional)
 */
export function hashIpAddress(ip: string): string {
  // Simple hash for demo - in production, use a proper cryptographic hash with salt
  let hash = 0
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return `ip_${Math.abs(hash).toString(36)}`
}

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string | null {
  // Check various headers for IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp
  }
  
  return null
}
