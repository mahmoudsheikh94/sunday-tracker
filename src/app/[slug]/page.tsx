'use client'

import { useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

export default function ShortLinkPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string

  useEffect(() => {
    if (slug) {
      // Build the redirect URL with current search params
      const currentParams = new URLSearchParams(searchParams.toString())
      const redirectUrl = `/api/redirect/${slug}${currentParams.toString() ? `?${currentParams.toString()}` : ''}`
      
      // Redirect to the API route
      window.location.href = redirectUrl
    }
  }, [slug, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Redirecting...</h1>
        <p className="text-gray-600">Taking you to the tracking link</p>
      </div>
    </div>
  )
}
