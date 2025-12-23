/**
 * Home Assistant API Integration
 * 
 * Home Assistant can control HomeKit devices and provides an HTTP API.
 * This module provides functions to interact with Home Assistant.
 */

interface HomeAssistantConfig {
  baseUrl: string
  accessToken: string
}

interface HomeAssistantDevice {
  entity_id: string
  state: string
  attributes: Record<string, any>
}

let homeAssistantConfig: HomeAssistantConfig | null = null

function getHomeAssistantConfig(): HomeAssistantConfig | null {
  const baseUrl = process.env.HOME_ASSISTANT_URL
  const accessToken = process.env.HOME_ASSISTANT_ACCESS_TOKEN

  if (!baseUrl || !accessToken) {
    return null
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ''), // Remove trailing slash
    accessToken,
  }
}

/**
 * Get all devices from Home Assistant
 * Optionally filter by controllable device types (light, switch, cover, climate, etc.)
 */
export async function getHomeAssistantDevices(filterControllable: boolean = false): Promise<HomeAssistantDevice[]> {
  const config = getHomeAssistantConfig()
  if (!config) {
    console.error('🏠 [HomeAssistant] Configuration missing')
    throw new Error('Home Assistant is not configured. Please set HOME_ASSISTANT_URL and HOME_ASSISTANT_ACCESS_TOKEN environment variables.')
  }

  try {
    console.log('🏠 [HomeAssistant] Fetching devices from:', config.baseUrl)
    const response = await fetch(`${config.baseUrl}/api/states`, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('🏠 [HomeAssistant] API error:', response.status, response.statusText, errorText)
      throw new Error(`Home Assistant API error: ${response.status} ${response.statusText}`)
    }

    const devices = await response.json()
    console.log('🏠 [HomeAssistant] Received', devices.length, 'total devices')
    
    // Filter to only controllable devices if requested
    if (filterControllable) {
      const controllableDomains = [
        'light', 'switch', 'cover', 'climate', 'fan', 'lock', 
        'media_player', 'vacuum', 'scene', 'script', 'input_boolean',
        'input_number', 'input_select', 'input_text'
      ]
      
      const filtered = devices.filter((device: HomeAssistantDevice) => {
        const domain = device.entity_id.split('.')[0]
        return controllableDomains.includes(domain)
      })
      console.log('🏠 [HomeAssistant] Filtered to', filtered.length, 'controllable devices')
      return filtered
    }
    
    return devices
  } catch (error) {
    console.error('🏠 [HomeAssistant] Error fetching devices:', error)
    throw error
  }
}

/**
 * Get a specific device by entity_id
 */
export async function getHomeAssistantDevice(entityId: string): Promise<HomeAssistantDevice | null> {
  const config = getHomeAssistantConfig()
  if (!config) {
    throw new Error('Home Assistant is not configured.')
  }

  try {
    const response = await fetch(`${config.baseUrl}/api/states/${entityId}`, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Home Assistant API error: ${response.status} ${response.statusText}`)
    }

    const device = await response.json()
    return device
  } catch (error) {
    console.error(`Error fetching Home Assistant device ${entityId}:`, error)
    throw error
  }
}

/**
 * Control a Home Assistant device
 */
export async function controlHomeAssistantDevice(
  entityId: string,
  service: string,
  serviceData?: Record<string, any>
): Promise<boolean> {
  const config = getHomeAssistantConfig()
  if (!config) {
    throw new Error('Home Assistant is not configured.')
  }

  // Extract domain from entity_id (e.g., "light.living_room" -> "light")
  const domain = entityId.split('.')[0]

  try {
    const response = await fetch(`${config.baseUrl}/api/services/${domain}/${service}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entity_id: entityId,
        ...serviceData,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Home Assistant API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()
    return true
  } catch (error) {
    console.error(`Error controlling Home Assistant device ${entityId}:`, error)
    throw error
  }
}

/**
 * Turn on a device
 */
export async function turnOnDevice(entityId: string): Promise<boolean> {
  return controlHomeAssistantDevice(entityId, 'turn_on')
}

/**
 * Turn off a device
 */
export async function turnOffDevice(entityId: string): Promise<boolean> {
  return controlHomeAssistantDevice(entityId, 'turn_off')
}

/**
 * Turn off all lights in Home Assistant
 * Uses the light.turn_off service without entity_id to turn off all lights
 */
export async function turnOffAllLights(): Promise<{ success: boolean; error?: string }> {
  const config = getHomeAssistantConfig()
  if (!config) {
    const error = 'Home Assistant yapılandırılmamış. HOME_ASSISTANT_URL ve HOME_ASSISTANT_ACCESS_TOKEN environment variables\'larını kontrol edin.'
    console.error('❌ [HomeAssistant]', error)
    return { success: false, error }
  }

  try {
    const url = `${config.baseUrl}/api/services/light/turn_off`
    console.log('💡 [HomeAssistant] Turning off all lights:', url)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Empty body means all lights
    })

    const responseText = await response.text()
    console.log('💡 [HomeAssistant] Response status:', response.status, 'Response:', responseText.substring(0, 200))

    if (response.ok) {
      console.log('✅ [HomeAssistant] All lights turned off successfully')
      return { success: true }
    } else {
      let errorMessage = `Home Assistant API hatası: ${response.status} ${response.statusText}`
      try {
        const errorData = JSON.parse(responseText)
        if (errorData.message) {
          errorMessage = errorData.message
        }
      } catch {
        // If response is not JSON, use the text as error
        if (responseText) {
          errorMessage = responseText.substring(0, 200)
        }
      }
      
      console.error('❌ [HomeAssistant] Failed to turn off all lights:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        url,
      })
      
      // Provide user-friendly error messages
      if (response.status === 401) {
        errorMessage = 'Home Assistant yetkilendirme hatası. Token\'ın geçerli olduğundan emin olun.'
      } else if (response.status === 404) {
        errorMessage = 'Home Assistant servisi bulunamadı. URL\'nin doğru olduğundan emin olun.'
      } else if (response.status === 500) {
        errorMessage = 'Home Assistant sunucu hatası. Home Assistant log\'larını kontrol edin.'
      }
      
      return { success: false, error: errorMessage }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata'
    console.error('❌ [HomeAssistant] Error turning off all lights:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    })
    
    let userFriendlyError = 'Tüm ışıkları kapatırken bir hata oluştu.'
    if (errorMessage.includes('fetch')) {
      userFriendlyError = 'Home Assistant\'a bağlanılamıyor. URL\'nin doğru olduğundan ve Home Assistant\'ın çalıştığından emin olun.'
    }
    
    return { success: false, error: userFriendlyError }
  }
}

/**
 * Turn on all lights in Home Assistant
 * Uses the light.turn_on service without entity_id to turn on all lights
 */
export async function turnOnAllLights(): Promise<{ success: boolean; error?: string }> {
  const config = getHomeAssistantConfig()
  if (!config) {
    const error = 'Home Assistant yapılandırılmamış. HOME_ASSISTANT_URL ve HOME_ASSISTANT_ACCESS_TOKEN environment variables\'larını kontrol edin.'
    console.error('❌ [HomeAssistant]', error)
    return { success: false, error }
  }

  try {
    const url = `${config.baseUrl}/api/services/light/turn_on`
    console.log('💡 [HomeAssistant] Turning on all lights:', url)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Empty body means all lights
    })

    const responseText = await response.text()
    console.log('💡 [HomeAssistant] Response status:', response.status, 'Response:', responseText.substring(0, 200))

    if (response.ok) {
      console.log('✅ [HomeAssistant] All lights turned on successfully')
      return { success: true }
    } else {
      let errorMessage = `Home Assistant API hatası: ${response.status} ${response.statusText}`
      try {
        const errorData = JSON.parse(responseText)
        if (errorData.message) {
          errorMessage = errorData.message
        }
      } catch {
        // If response is not JSON, use the text as error
        if (responseText) {
          errorMessage = responseText.substring(0, 200)
        }
      }
      
      console.error('❌ [HomeAssistant] Failed to turn on all lights:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        url,
      })
      
      // Provide user-friendly error messages
      if (response.status === 401) {
        errorMessage = 'Home Assistant yetkilendirme hatası. Token\'ın geçerli olduğundan emin olun.'
      } else if (response.status === 404) {
        errorMessage = 'Home Assistant servisi bulunamadı. URL\'nin doğru olduğundan emin olun.'
      } else if (response.status === 500) {
        errorMessage = 'Home Assistant sunucu hatası. Home Assistant log\'larını kontrol edin.'
      }
      
      return { success: false, error: errorMessage }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata'
    console.error('❌ [HomeAssistant] Error turning on all lights:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    })
    
    let userFriendlyError = 'Tüm ışıkları açarken bir hata oluştu.'
    if (errorMessage.includes('fetch')) {
      userFriendlyError = 'Home Assistant\'a bağlanılamıyor. URL\'nin doğru olduğundan ve Home Assistant\'ın çalıştığından emin olun.'
    }
    
    return { success: false, error: userFriendlyError }
  }
}

/**
 * Set brightness for a light
 */
export async function setBrightness(entityId: string, brightness: number): Promise<boolean> {
  // Brightness is 0-255 in Home Assistant
  const brightnessValue = Math.max(0, Math.min(255, Math.round(brightness * 2.55))) // Convert 0-100 to 0-255
  return controlHomeAssistantDevice(entityId, 'turn_on', {
    brightness: brightnessValue,
  })
}

/**
 * Set color temperature for a light
 */
export async function setColorTemperature(entityId: string, colorTemp: number): Promise<boolean> {
  return controlHomeAssistantDevice(entityId, 'turn_on', {
    color_temp: colorTemp,
  })
}

/**
 * Set color for a light (RGB)
 */
export async function setColor(entityId: string, rgb: [number, number, number]): Promise<boolean> {
  return controlHomeAssistantDevice(entityId, 'turn_on', {
    rgb_color: rgb,
  })
}

/**
 * Search for devices by name
 */
export async function searchDevices(query: string): Promise<HomeAssistantDevice[]> {
  const devices = await getHomeAssistantDevices()
  const lowerQuery = query.toLowerCase()

  return devices.filter(device => {
    const friendlyName = device.attributes.friendly_name || device.entity_id
    return friendlyName.toLowerCase().includes(lowerQuery) ||
           device.entity_id.toLowerCase().includes(lowerQuery)
  })
}

/**
 * Get device state
 */
export async function getDeviceState(entityId: string): Promise<string | null> {
  const device = await getHomeAssistantDevice(entityId)
  return device?.state || null
}

/**
 * Control vacuum (Roomba, etc.)
 */
export async function controlVacuum(entityId: string, action: 'start' | 'pause' | 'stop' | 'return_to_base' | 'locate'): Promise<boolean> {
  return controlHomeAssistantDevice(entityId, action)
}

/**
 * Start vacuum cleaning
 */
export async function startVacuum(entityId: string): Promise<boolean> {
  return controlVacuum(entityId, 'start')
}

/**
 * Pause vacuum cleaning
 */
export async function pauseVacuum(entityId: string): Promise<boolean> {
  return controlVacuum(entityId, 'pause')
}

/**
 * Stop vacuum cleaning
 */
export async function stopVacuum(entityId: string): Promise<boolean> {
  return controlVacuum(entityId, 'stop')
}

/**
 * Return vacuum to base
 */
export async function returnVacuumToBase(entityId: string): Promise<boolean> {
  return controlVacuum(entityId, 'return_to_base')
}

/**
 * Control media player
 */
export async function controlMediaPlayer(
  entityId: string, 
  action: 'play' | 'pause' | 'stop' | 'next_track' | 'previous_track' | 'volume_set' | 'volume_mute'
): Promise<boolean> {
  if (action === 'volume_set') {
    // Volume set requires volume_level (0-1)
    return controlHomeAssistantDevice(entityId, 'volume_set', { volume_level: 0.5 })
  }
  return controlHomeAssistantDevice(entityId, action)
}

