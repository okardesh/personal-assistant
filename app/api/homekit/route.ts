import { NextRequest, NextResponse } from 'next/server'
import {
  getHomeAssistantDevices,
  getHomeAssistantDevice,
  controlHomeAssistantDevice,
  turnOnDevice,
  turnOffDevice,
  setBrightness,
  searchDevices,
  startVacuum,
  pauseVacuum,
  stopVacuum,
  returnVacuumToBase,
  controlMediaPlayer,
} from '@/lib/homeAssistant'

/**
 * HomeKit Device Control API
 * 
 * This endpoint allows controlling HomeKit devices through Home Assistant.
 * 
 * Requires:
 * - HOME_ASSISTANT_URL environment variable
 * - HOME_ASSISTANT_ACCESS_TOKEN environment variable
 * - Home Assistant with HomeKit integration enabled
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')
    const entityId = searchParams.get('entity_id')
    const query = searchParams.get('query')

    // List all devices (filter to only controllable devices by default)
    if (action === 'list' || !action) {
      const filterControllable = searchParams.get('all') !== 'true'
      const devices = await getHomeAssistantDevices(filterControllable)
      return NextResponse.json({ 
        devices,
        filtered: filterControllable,
        total: devices.length
      })
    }

    // Search devices
    if (action === 'search' && query) {
      const devices = await searchDevices(query)
      return NextResponse.json({ devices })
    }

    // Get device info
    if (action === 'get' && entityId) {
      const device = await getHomeAssistantDevice(entityId)
      if (!device) {
        return NextResponse.json(
          { error: 'Device not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ device })
    }

    return NextResponse.json(
      { error: 'Invalid action or missing parameters' },
      { status: 400 }
    )
  } catch (error) {
    console.error('HomeKit API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, entity_id, service_data } = body

    if (!action || !entity_id) {
      return NextResponse.json(
        { error: 'action and entity_id are required' },
        { status: 400 }
      )
    }

    let result: boolean

    // Determine device type from entity_id
    const domain = entity_id.split('.')[0]

    switch (action) {
      case 'turn_on':
        result = await turnOnDevice(entity_id)
        break

      case 'turn_off':
        result = await turnOffDevice(entity_id)
        break

      case 'set_brightness':
        if (typeof service_data?.brightness !== 'number') {
          return NextResponse.json(
            { error: 'brightness (0-100) is required for set_brightness action' },
            { status: 400 }
          )
        }
        result = await setBrightness(entity_id, service_data.brightness)
        break

      // Vacuum (Roomba) actions
      case 'start':
        if (domain === 'vacuum') {
          result = await startVacuum(entity_id)
        } else {
          result = await turnOnDevice(entity_id)
        }
        break

      case 'pause':
        if (domain === 'vacuum') {
          result = await pauseVacuum(entity_id)
        } else if (domain === 'media_player') {
          result = await controlMediaPlayer(entity_id, 'pause')
        } else {
          return NextResponse.json(
            { error: `Pause action not supported for ${domain} devices` },
            { status: 400 }
          )
        }
        break

      case 'stop':
        if (domain === 'vacuum') {
          result = await stopVacuum(entity_id)
        } else if (domain === 'media_player') {
          result = await controlMediaPlayer(entity_id, 'stop')
        } else {
          result = await turnOffDevice(entity_id)
        }
        break

      case 'return_to_base':
        if (domain === 'vacuum') {
          result = await returnVacuumToBase(entity_id)
        } else {
          return NextResponse.json(
            { error: 'return_to_base action only supported for vacuum devices' },
            { status: 400 }
          )
        }
        break

      // Media player actions
      case 'play':
        if (domain === 'media_player') {
          result = await controlMediaPlayer(entity_id, 'play')
        } else {
          result = await turnOnDevice(entity_id)
        }
        break

      case 'next_track':
        if (domain === 'media_player') {
          result = await controlMediaPlayer(entity_id, 'next_track')
        } else {
          return NextResponse.json(
            { error: 'next_track action only supported for media players' },
            { status: 400 }
          )
        }
        break

      case 'previous_track':
        if (domain === 'media_player') {
          result = await controlMediaPlayer(entity_id, 'previous_track')
        } else {
          return NextResponse.json(
            { error: 'previous_track action only supported for media players' },
            { status: 400 }
          )
        }
        break

      case 'control':
        // Generic control with custom service and service_data
        const service = service_data?.service || 'turn_on'
        result = await controlHomeAssistantDevice(entity_id, service, service_data)
        break

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Supported actions: turn_on, turn_off, set_brightness, start, pause, stop, return_to_base, play, next_track, previous_track, control` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: result,
      message: `Device ${entity_id} ${action} completed`,
    })
  } catch (error) {
    console.error('HomeKit API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to control device',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

