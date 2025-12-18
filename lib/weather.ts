interface WeatherData {
  temperature: number
  feelsLike: number
  description: string
  humidity: number
  windSpeed: number
  city?: string
  country?: string
}

export async function getWeather(latitude: number, longitude: number): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY

  if (!apiKey) {
    console.error('OpenWeatherMap API key is not configured')
    return null
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric&lang=tr`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error('Failed to fetch weather data:', response.statusText)
      return null
    }

    const data = await response.json()

    return {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
      city: data.name,
      country: data.sys.country,
    }
  } catch (error) {
    console.error('Error fetching weather:', error)
    return null
  }
}

export async function getWeatherByCity(city: string): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY

  if (!apiKey) {
    console.error('OpenWeatherMap API key is not configured')
    return null
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=tr`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error('Failed to fetch weather data:', response.statusText)
      return null
    }

    const data = await response.json()

    return {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
      city: data.name,
      country: data.sys.country,
    }
  } catch (error) {
    console.error('Error fetching weather:', error)
    return null
  }
}

