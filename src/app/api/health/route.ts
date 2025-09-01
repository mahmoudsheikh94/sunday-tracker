import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    checks: {
      database: 'unknown',
      environment: 'unknown'
    },
    environment_variables: {
      DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'missing',
      SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID ? 'set' : 'missing',
      SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET ? 'set' : 'missing',
      SPOTIFY_REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI ? 'set' : 'missing',
      APP_BASE_URL: process.env.APP_BASE_URL ? 'set' : 'missing',
      CRON_KEY: process.env.CRON_KEY ? 'set' : 'missing'
    }
  }

  try {
    // Test database connection
    await prisma.$connect()
    const result = await prisma.$queryRaw`SELECT 1 as test`
    health.checks.database = 'connected'
    await prisma.$disconnect()
  } catch (error) {
    health.checks.database = 'error'
    health.status = 'error'
    health.error = error instanceof Error ? error.message : 'Unknown database error'
  }

  // Check environment variables
  const requiredVars = [
    'DATABASE_URL',
    'SPOTIFY_CLIENT_ID', 
    'SPOTIFY_CLIENT_SECRET',
    'SPOTIFY_REDIRECT_URI',
    'APP_BASE_URL',
    'CRON_KEY'
  ]
  
  const missingVars = requiredVars.filter(varName => !process.env[varName])
  if (missingVars.length === 0) {
    health.checks.environment = 'complete'
  } else {
    health.checks.environment = 'incomplete'
    health.missing_variables = missingVars
  }

  const statusCode = health.status === 'ok' ? 200 : 500
  
  return NextResponse.json(health, { status: statusCode })
}
