import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect()
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test, NOW() as timestamp`
    
    await prisma.$disconnect()
    
    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
      database_test: result,
      environment_vars: {
        DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'missing',
        NODE_ENV: process.env.NODE_ENV || 'unknown'
      }
    })
    
  } catch (error) {
    console.error('Database test failed:', error)
    
    // Handle the error properly with type checking
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return NextResponse.json({
      status: 'error',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      error: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      environment_vars: {
        DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'missing',
        NODE_ENV: process.env.NODE_ENV || 'unknown'
      }
    }, { status: 500 })
  }
}
