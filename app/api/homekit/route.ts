import { NextRequest, NextResponse } from 'next/server'
import {
  getHomeAssistantDevices,
  getHomeAssistantDevice,
  controlHomeAssistantDevice,
  turnOnDevice,
  turnOffDevice,
  setBrightness,
  searchDevices,
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

    // List all devices
    if (action === 'list' || !action) {
      const devices = await getHomeAssistantDevices()
      return NextResponse.json({ devices })
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

      case 'control':
        // Generic control with custom service and service_data
        const service = service_data?.service || 'turn_on'
        result = await controlHomeAssistantDevice(entity_id, service, service_data)
        break

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Supported actions: turn_on, turn_off, set_brightness, control` },
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

