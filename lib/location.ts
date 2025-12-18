interface Location {
  latitude: number
  longitude: number
  address?: string
}

export async function getLocation(): Promise<Location | null> {
  try {
    // In a real implementation, this would use the browser's Geolocation API
    // For server-side, you might use IP-based geolocation or require client-side calls
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/location`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Failed to fetch location')
      return null
    }

    const data = await response.json()
    return data.location || null
  } catch (error) {
    console.error('Error fetching location:', error)
    return null
  }
}

