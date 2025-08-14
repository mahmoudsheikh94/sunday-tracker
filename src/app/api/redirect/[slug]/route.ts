import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateClickTrackingId, extractUtmParams, getClientIp, hashIpAddress } from '@/lib/cookies'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    // Find the tracking link
    const trackingLink = await prisma.trackingLink.findUnique({
      where: { slug },
      include: {
        playlist: true
      }
    })

    if (!trackingLink || !trackingLink.isActive) {
      // Redirect to home page if link not found
      return NextResponse.redirect(`${process.env.APP_BASE_URL}/`)
    }

    // Generate a unique click ID
    const clickId = generateClickTrackingId()
    
    // Extract UTM parameters from the actual request
    const utmParams = extractUtmParams(request)
    
    // Get client IP from the actual request
    const clientIp = getClientIp(request)
    const ipHash = clientIp ? hashIpAddress(clientIp) : null

    // Create the click record
    try {
      await prisma.click.create({
        data: {
          linkId: trackingLink.id,
          clickId,
          userAgent: request.headers.get('user-agent') || 'Unknown',
          ipHash,
          utms: utmParams
        }
      })
    } catch (dbError) {
      console.error('Failed to create click record:', dbError)
      // Continue with redirect even if click tracking fails
    }

    // Redirect to consent page with the slug and click_id
    const consentUrl = `${process.env.APP_BASE_URL}/consent?slug=${slug}&click_id=${clickId}`
    return NextResponse.redirect(consentUrl)

  } catch (error) {
    console.error('Error in short link redirect:', error)
    // Fallback redirect to home page
    return NextResponse.redirect(`${process.env.APP_BASE_URL}/`)
  }
}
