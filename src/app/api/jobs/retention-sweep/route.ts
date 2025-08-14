import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Verify cron key
    const cronKey = request.headers.get('X-CRON-KEY')
    if (cronKey !== process.env.CRON_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const cutoffDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)

    // Find connections that are beyond the 45-day window
    const expiredConnections = await prisma.userConnection.findMany({
      where: {
        isActive: true,
        connectedAt: {
          lt: cutoffDate
        }
      },
      select: {
        id: true,
        connectedAt: true,
        endAt: true
      }
    })

    if (expiredConnections.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired connections found',
        processed: 0
      })
    }

    // Mark connections as inactive and set end date
    const updateResult = await prisma.userConnection.updateMany({
      where: {
        id: {
          in: expiredConnections.map(c => c.id)
        }
      },
      data: {
        isActive: false,
        endAt: new Date()
      }
    })

    console.log(`Marked ${updateResult.count} connections as inactive after 45-day retention period`)

    return NextResponse.json({
      success: true,
      message: `Marked ${updateResult.count} connections as inactive`,
      processed: updateResult.count,
      cutoffDate: cutoffDate.toISOString()
    })

  } catch (error) {
    console.error('Error in retention-sweep job:', error)
    return NextResponse.json(
      { error: 'Failed to process retention sweep' },
      { status: 500 }
    )
  }
}
