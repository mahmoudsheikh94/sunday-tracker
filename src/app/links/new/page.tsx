'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewLinkPage() {
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [title, setTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [generatedLink, setGeneratedLink] = useState<any>(null)
  const router = useRouter()

  const handlePreview = async () => {
    if (!playlistUrl.trim()) {
      setError('Please enter a Spotify playlist URL')
      return
    }

    setIsLoading(true)
    setError('')
    setPreview(null)

    try {
      const response = await fetch(`/api/links/preview?playlistId=${extractPlaylistId(playlistUrl)}`)
      
      if (!response.ok) {
        throw new Error('Failed to preview playlist')
      }

      const data = await response.json()
      setPreview(data)
    } catch (error) {
      setError('Failed to preview playlist. Please check the URL and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!playlistUrl.trim() || !preview) {
      setError('Please preview the playlist first')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistUrl: playlistUrl.trim(),
          title: title.trim() || undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create tracking link')
      }

      const data = await response.json()
      setGeneratedLink(data)
    } catch (error: any) {
      setError(error.message || 'Failed to create tracking link')
    } finally {
      setIsLoading(false)
    }
  }

  const extractPlaylistId = (url: string): string => {
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/)
    return match ? match[1] : ''
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (generatedLink) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Tracking Link Created!
          </h1>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-left">
              <h3 className="font-medium text-gray-900 mb-2">Link Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Short URL:</span>
                  <code className="bg-white px-2 py-1 rounded text-green-600 font-mono">
                    {generatedLink.url}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Playlist:</span>
                  <span className="font-medium">{generatedLink.link.playlist.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Owner:</span>
                  <span>{generatedLink.link.playlist.ownerName}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => copyToClipboard(generatedLink.url)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Copy Link to Clipboard
            </button>
            
            <Link
              href="/links"
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors block text-center"
            >
              View All Links
            </Link>
            
            <button
              onClick={() => {
                setGeneratedLink(null)
                setPlaylistUrl('')
                setTitle('')
                setPreview(null)
              }}
              className="w-full bg-white hover:bg-gray-50 text-gray-600 font-medium py-3 px-4 rounded-md font-medium border border-gray-300"
            >
              Create Another Link
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/links"
          className="text-green-600 hover:text-green-700 font-medium"
        >
          ← Back to Links
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">Create New Tracking Link</h1>
        <p className="text-gray-600 mt-2">
          Generate a short tracking link for a Spotify playlist to monitor engagement
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <form onSubmit={(e) => { e.preventDefault(); handlePreview(); }} className="space-y-6">
          <div>
            <label htmlFor="playlistUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Spotify Playlist URL
            </label>
            <input
              type="url"
              id="playlistUrl"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder="https://open.spotify.com/playlist/..."
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Paste the full Spotify playlist URL here
            </p>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Internal Label (Optional)
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Summer Hits 2024, Workout Mix"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              A label to help you identify this link in your dashboard
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={isLoading || !playlistUrl.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {isLoading ? 'Loading...' : 'Preview Playlist'}
            </button>
          </div>
        </form>

        {preview && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Playlist Preview</h3>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-4">
                {preview.imageUrl && (
                  <img
                    src={preview.imageUrl}
                    alt={preview.name}
                    className="w-16 h-16 rounded object-cover"
                  />
                )}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{preview.name}</h4>
                  <p className="text-gray-600">{preview.ownerName}</p>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                    <span>{preview.trackCount} tracks</span>
                    <span>{preview.followers} followers</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Tracking Link'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
