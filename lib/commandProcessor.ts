import { getCalendarEvents } from './calendar'
import { getEmails } from './email'

interface Location {
  latitude: number
  longitude: number
  address?: string
}

export async function processCommand(message: string, location?: Location | null): Promise<string> {
  const lowerMessage = message.toLowerCase()

  // Calendar commands
  if (lowerMessage.includes('calendar') || lowerMessage.includes('meeting') || lowerMessage.includes('event')) {
    if (lowerMessage.includes('today') || lowerMessage.includes('today\'s')) {
      const events = await getCalendarEvents('today')
      if (events.length === 0) {
        return "You don't have any events scheduled for today."
      }
      return `Here are your events for today:\n\n${events.map(e => `• ${e.title} at ${e.time}`).join('\n')}`
    }
    
    if (lowerMessage.includes('tomorrow')) {
      const events = await getCalendarEvents('tomorrow')
      if (events.length === 0) {
        return "You don't have any events scheduled for tomorrow."
      }
      return `Here are your events for tomorrow:\n\n${events.map(e => `• ${e.title} at ${e.time}`).join('\n')}`
    }
    
    if (lowerMessage.includes('this week') || lowerMessage.includes('week')) {
      const events = await getCalendarEvents('week')
      if (events.length === 0) {
        return "You don't have any events scheduled for this week."
      }
      return `Here are your events for this week:\n\n${events.map(e => `• ${e.title} - ${e.date} at ${e.time}`).join('\n')}`
    }

    // Default: show today's events
    const events = await getCalendarEvents('today')
    if (events.length === 0) {
      return "You don't have any events scheduled for today. Would you like me to check tomorrow or this week?"
    }
    return `Here are your events for today:\n\n${events.map(e => `• ${e.title} at ${e.time}`).join('\n')}`
  }

  // Email commands
  if (lowerMessage.includes('email') || lowerMessage.includes('mail') || lowerMessage.includes('inbox')) {
    if (lowerMessage.includes('unread') || lowerMessage.includes('new')) {
      const emails = await getEmails({ unread: true })
      if (emails.length === 0) {
        return "You don't have any unread emails."
      }
      return `You have ${emails.length} unread email${emails.length > 1 ? 's' : ''}:\n\n${emails.slice(0, 5).map(e => `• ${e.subject} - ${e.from}`).join('\n')}${emails.length > 5 ? `\n\n...and ${emails.length - 5} more` : ''}`
    }

    const emails = await getEmails({ limit: 5 })
    if (emails.length === 0) {
      return "Your inbox is empty."
    }
    return `Here are your recent emails:\n\n${emails.map(e => `• ${e.subject} - ${e.from}`).join('\n')}`
  }

  // Location commands
  if (lowerMessage.includes('location') || lowerMessage.includes('where am i') || lowerMessage.includes('where are you')) {
    if (!location) {
      return "I couldn't access your location. Please make sure location permissions are enabled in your browser."
    }
    return `You are currently at: ${location.address || `${location.latitude}, ${location.longitude}`}`
  }

  // Weather (using location)
  if (lowerMessage.includes('weather')) {
    if (!location) {
      return "I need your location to check the weather. Please enable location permissions in your browser."
    }
    return `I can see you're at ${location.address || `${location.latitude}, ${location.longitude}`}. To get weather information, I would need to integrate with a weather API. Would you like me to add that feature?`
  }

  // Default response
  return `I understand you said: "${message}". I can help you with:\n\n• Calendar: "Show my calendar", "What meetings do I have today?", "Events this week"\n• Email: "Check my emails", "Show unread emails", "What's in my inbox?"\n• Location: "Where am I?", "What's my location?"\n\nHow can I assist you?`
}

