// Client-side location utilities
// This should be used from React components

interface Location {
  latitude: number
  longitude: number
  address?: string
}

export async function getClientLocation(): Promise<Location | null> {
  if (typeof window === 'undefined') {
    return null
  }

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }

        // Optionally get address via reverse geocoding
        try {
          // You would use a geocoding service here
          // For example: Google Maps Geocoding API, OpenStreetMap Nominatim, etc.
          // location.address = await reverseGeocode(location.latitude, location.longitude)
        } catch (error) {
          console.error('Error getting address:', error)
        }

        resolve(location)
      },
      (error) => {
        console.error('Error getting location:', error)
        resolve(null)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  })
}

