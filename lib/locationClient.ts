// Client-side location utilities
// This should be used from React components

interface Location {
  latitude: number
  longitude: number
  address?: string
}

const LOCATION_CACHE_KEY = 'personal-assistant-location'
const LOCATION_CACHE_EXPIRY = 30 * 60 * 1000 // 30 minutes

interface CachedLocation extends Location {
  timestamp: number
}

export async function getClientLocation(forceRefresh = false): Promise<Location | null> {
  if (typeof window === 'undefined') {
    return null
  }

  // If force refresh, clear permission denied flag to allow retry
  if (forceRefresh) {
    localStorage.removeItem('location-permission-denied')
    console.log('📍 Force refresh: cleared permission denied flag to allow retry')
  }

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = localStorage.getItem(LOCATION_CACHE_KEY)
    if (cached) {
      try {
        const cachedLocation: CachedLocation = JSON.parse(cached)
        const now = Date.now()
        // Use cached location if it's less than 30 minutes old
        if (now - cachedLocation.timestamp < LOCATION_CACHE_EXPIRY) {
          console.log('📍 Using cached location')
          return {
            latitude: cachedLocation.latitude,
            longitude: cachedLocation.longitude,
            address: cachedLocation.address,
          }
        }
      } catch (error) {
        console.error('Error reading cached location:', error)
      }
    }
  }

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('📍 Geolocation API not available')
      resolve(null)
      return
    }

    console.log('📍 Calling navigator.geolocation.getCurrentPosition...')
    console.log('📍 Options:', {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: forceRefresh ? 0 : 300000, // 5 minutes if not forcing refresh
    })

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }

        // Cache the location
        const cachedLocation: CachedLocation = {
          ...location,
          timestamp: Date.now(),
        }
        localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cachedLocation))
        // Clear permission denied flag if we got location
        localStorage.removeItem('location-permission-denied')
        console.log('✅ Location obtained and cached:', location.latitude, location.longitude)

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
        console.error('❌ Geolocation error:', error)
        console.error('❌ Error code:', error.code)
        console.error('❌ Error message:', error.message)
        
        // If permission was denied, remember it so we don't ask again
        if (error.code === error.PERMISSION_DENIED) {
          localStorage.setItem('location-permission-denied', 'true')
          console.log('❌ Location permission denied by user')
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          console.log('⚠️ Location information unavailable')
        } else if (error.code === error.TIMEOUT) {
          console.log('⏱️ Location request timeout')
        }
        resolve(null)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout
        maximumAge: forceRefresh ? 0 : 300000, // 5 minutes if not forcing refresh
      }
    )
  })
}

export function hasLocationPermission(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return localStorage.getItem('location-permission-denied') !== 'true'
}

