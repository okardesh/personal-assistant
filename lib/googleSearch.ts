// Google Search integration for finding nearby events
// Uses Google Custom Search API or Google Places API

interface GoogleSearchResult {
  title: string
  link: string
  snippet: string
}

interface NearbyEvent {
  title: string
  location: string
  description?: string
  link?: string
}

export async function searchNearbyEvents(
  latitude: number,
  longitude: number,
  query: string = 'events'
): Promise<NearbyEvent[]> {
  // Option 1: Google Custom Search API
  const customSearchApiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY
  const customSearchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID

  if (customSearchApiKey && customSearchEngineId) {
    try {
      // Try multiple search queries for better results
      const queries = [
        `${query} near ${latitude},${longitude}`,
        `${query} ${latitude},${longitude}`,
        `events activities ${latitude},${longitude}`,
      ]
      
      let allResults: NearbyEvent[] = []
      
      for (const locationQuery of queries) {
        const url = `https://www.googleapis.com/customsearch/v1?key=${customSearchApiKey}&cx=${customSearchEngineId}&q=${encodeURIComponent(locationQuery)}&num=5`
        
        console.log('🔍 Google Search:', locationQuery)
        const response = await fetch(url)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ Google Custom Search API error:', response.status, errorText.substring(0, 200))
          continue
        }

        const data = await response.json()
        console.log('✅ Google Search results:', data.items?.length || 0)

        for (const item of data.items || []) {
          allResults.push({
            title: item.title,
            location: item.displayLink || item.link || '',
            description: item.snippet,
            link: item.link,
          })
        }
        
        // If we got results, break (don't try other queries)
        if (allResults.length > 0) break
      }

      // Remove duplicates
      const uniqueResults = allResults.filter((result, index, self) =>
        index === self.findIndex((r) => r.title === result.title && r.link === result.link)
      )

      console.log('✅ Total unique Google results:', uniqueResults.length)
      return uniqueResults.slice(0, 10) // Limit to 10 results
    } catch (error) {
      console.error('❌ Error searching Google:', error)
      if (error instanceof Error) {
        console.error('Error message:', error.message)
      }
      return []
    }
  }

  // Option 2: Google Places API (Text Search)
  const placesApiKey = process.env.GOOGLE_PLACES_API_KEY

  if (placesApiKey) {
    try {
      const locationQuery = `${query} near ${latitude},${longitude}`
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(locationQuery)}&key=${placesApiKey}&language=tr`
      
      const response = await fetch(url)
      if (!response.ok) {
        console.error('Google Places API error:', response.status)
        return []
      }

      const data = await response.json()
      const results: NearbyEvent[] = []

      for (const place of data.results || []) {
        results.push({
          title: place.name,
          location: place.formatted_address || place.vicinity || '',
          description: place.types?.join(', ') || '',
          link: place.place_id ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}` : undefined,
        })
      }

      return results
    } catch (error) {
      console.error('Error searching Google Places:', error)
      return []
    }
  }

  // If no API keys configured, return empty
  console.warn('Google API keys not configured. Add GOOGLE_CUSTOM_SEARCH_API_KEY or GOOGLE_PLACES_API_KEY to .env.local')
  return []
}

// General Google search (without location requirement)
export async function searchGoogle(query: string): Promise<NearbyEvent[]> {
  const customSearchApiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY
  const customSearchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID

  if (customSearchApiKey && customSearchEngineId) {
    try {
      // For event/concert searches, try to get more detailed results
      const isEventSearch = query.toLowerCase().includes('konser') || 
                           query.toLowerCase().includes('concert') || 
                           query.toLowerCase().includes('etkinlik') || 
                           query.toLowerCase().includes('event')
      
      const numResults = isEventSearch ? 10 : 10
      const url = `https://www.googleapis.com/customsearch/v1?key=${customSearchApiKey}&cx=${customSearchEngineId}&q=${encodeURIComponent(query)}&num=${numResults}`
      
      console.log('🔍 Google Search (general):', query)
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Google Custom Search API error:', response.status, errorText.substring(0, 200))
        return []
      }

      const data = await response.json()
      console.log('✅ Google Search results:', data.items?.length || 0)

      const results: NearbyEvent[] = []
      for (const item of data.items || []) {
        // Try to extract date/time and location from snippet
        let location = item.displayLink || item.link || ''
        let description = item.snippet || ''
        
        // Try to extract location from snippet (look for common patterns)
        const locationPatterns = [
          /(?:yer|location|mekan|venue)[\s:]+([^,\.\n]+)/i,
          /([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)*)\s+(?:Sahne|Salon|Hall|Theater|Tiyatro)/i,
          /([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)*)\s+(?:Kadıköy|Beşiktaş|Şişli|Beyoğlu|Taksim)/i,
        ]
        
        for (const pattern of locationPatterns) {
          const match = description.match(pattern)
          if (match && match[1]) {
            location = match[1].trim()
            break
          }
        }
        
        // If no location found in snippet, try title
        if (!location || location === item.displayLink) {
          const titleLocationMatch = item.title.match(/([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)*)\s+(?:Sahne|Salon|Hall|Theater|Tiyatro|Kadıköy|Beşiktaş|Şişli|Beyoğlu|Taksim)/i)
          if (titleLocationMatch && titleLocationMatch[1]) {
            location = titleLocationMatch[1].trim()
          }
        }

        results.push({
          title: item.title,
          location: location,
          description: description,
          link: item.link,
        })
      }

      return results
    } catch (error) {
      console.error('❌ Error searching Google:', error)
      if (error instanceof Error) {
        console.error('Error message:', error.message)
      }
      return []
    }
  }

  console.warn('Google API keys not configured. Add GOOGLE_CUSTOM_SEARCH_API_KEY to .env.local')
  return []
}

