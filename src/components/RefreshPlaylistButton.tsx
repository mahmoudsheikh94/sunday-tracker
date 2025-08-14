'use client'

interface RefreshPlaylistButtonProps {
  linkId: string
}

export default function RefreshPlaylistButton({ linkId }: RefreshPlaylistButtonProps) {
  const handleRefresh = async () => {
    if (confirm('Refresh playlist tracks from Spotify?')) {
      try {
        const response = await fetch(`/api/links/${linkId}/refresh-playlist`, {
          method: 'POST'
        })
        if (response.ok) {
          window.location.reload()
        } else {
          alert('Failed to refresh playlist')
        }
      } catch (error) {
        alert('Error refreshing playlist')
      }
    }
  }

  return (
    <button
      onClick={handleRefresh}
      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
    >
      🔄 Refresh Playlist
    </button>
  )
}
