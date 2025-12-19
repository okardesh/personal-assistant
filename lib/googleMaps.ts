// Google Maps Directions API integration

interface Location {
  lat: number
  lng: number
}

export interface Route {
  distance: {
    text: string
    value: number // in meters
  }
  duration: {
    text: string
    value: number // in seconds
  }
  duration_base?: {
    text: string
    value: number // in seconds (without traffic)
  }
  duration_in_traffic?: {
    text: string
    value: number // in seconds (with traffic)
  }
  traffic_delay?: number // Traffic delay in seconds
  steps: Array<{
    distance: { text: string; value: number }
    duration: { text: string; value: number }
    html_instructions: string
    travel_mode: string
  }>
}

interface DirectionsResponse {
  routes: Array<{
    legs: Array<{
      distance: { text: string; value: number }
      duration: { text: string; value: number }
      duration_in_traffic?: { text: string; value: number }
      steps: Array<{
        distance: { text: string; value: number }
        duration: { text: string; value: number }
        html_instructions: string
        travel_mode: string
      }>
    }>
    summary: string
  }>
  status: string
}

// Get directions from origin to destination
export async function getDirections(
  origin: Location | string,
  destination: string,
  mode: 'driving' | 'walking' | 'transit' | 'bicycling' = 'driving'
): Promise<Route | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured')
  }

  try {
    // If origin is a string (place name), we'll use it directly
    // If it's a Location object, format as lat,lng
    const originStr = typeof origin === 'string' 
      ? origin 
      : `${origin.lat},${origin.lng}`

    const url = `https://maps.googleapis.com/maps/api/directions/json?${new URLSearchParams({
      origin: originStr,
      destination: destination,
      mode: mode,
      key: apiKey,
      language: 'tr',
      alternatives: 'false',
      traffic_model: 'best_guess',
      departure_time: 'now',
    })}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.status}`)
    }

    const data: DirectionsResponse = await response.json()

    if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
      console.error('Google Maps Directions error:', data.status)
      return null
    }

    const route = data.routes[0]
    const leg = route.legs[0]

    // Include both duration and duration_in_traffic for traffic analysis
    const baseDuration = leg.duration
    const trafficDuration = leg.duration_in_traffic || leg.duration

    return {
      distance: leg.distance,
      duration: trafficDuration, // Use traffic duration as primary
      duration_base: baseDuration, // Base duration without traffic
      duration_in_traffic: trafficDuration, // Duration with traffic
      traffic_delay: trafficDuration.value - baseDuration.value, // Traffic delay in seconds
      steps: leg.steps.map(step => ({
        distance: step.distance,
        duration: step.duration,
        html_instructions: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
        travel_mode: step.travel_mode,
      })),
    }
  } catch (error) {
    console.error('Error getting directions:', error)
    throw error
  }
}

// Search for a place using Google Places API
export async function searchPlace(query: string): Promise<Location | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured')
  }

  try {
    // Use Places Text Search API
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${new URLSearchParams({
      query: query,
      key: apiKey,
      language: 'tr',
    })}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error('Google Places search error:', data.status)
      return null
    }

    const place = data.results[0]
    return {
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
    }
  } catch (error) {
    console.error('Error searching place:', error)
    throw error
  }
}

// Get route information with multiple modes
export async function getBestRoute(
  origin: Location | string,
  destination: string
): Promise<{
  driving?: Route
  walking?: Route
  transit?: Route
  bicycling?: Route
} | null> {
  try {
    const [driving, walking, transit, bicycling] = await Promise.allSettled([
      getDirections(origin, destination, 'driving'),
      getDirections(origin, destination, 'walking'),
      getDirections(origin, destination, 'transit'),
      getDirections(origin, destination, 'bicycling'),
    ])

    const result: any = {}
    if (driving.status === 'fulfilled' && driving.value) result.driving = driving.value
    if (walking.status === 'fulfilled' && walking.value) result.walking = walking.value
    if (transit.status === 'fulfilled' && transit.value) result.transit = transit.value
    if (bicycling.status === 'fulfilled' && bicycling.value) result.bicycling = bicycling.value

    return Object.keys(result).length > 0 ? result : null
  } catch (error) {
    console.error('Error getting best route:', error)
    return null
  }
}

