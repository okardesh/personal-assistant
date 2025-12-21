// Storage utilities for persisting conversation history and user context

const MESSAGES_STORAGE_KEY = 'wise-assistant-messages'
const USER_CONTEXT_STORAGE_KEY = 'wise-assistant-user-context'
const MAX_STORED_MESSAGES = 100 // Store last 100 messages

export interface UserContext {
  name?: string
  preferences?: {
    language?: string
    timezone?: string
    [key: string]: any
  }
  metadata?: {
    [key: string]: any
  }
}

export interface StoredMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string // ISO string
  spotifyAction?: any
}

// Save messages to localStorage
export function saveMessages(messages: StoredMessage[]): void {
  if (typeof window === 'undefined') return
  
  try {
    // Keep only last MAX_STORED_MESSAGES messages
    const messagesToSave = messages.slice(-MAX_STORED_MESSAGES)
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messagesToSave))
  } catch (error) {
    console.error('Error saving messages to localStorage:', error)
  }
}

// Load messages from localStorage
export function loadMessages(): StoredMessage[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(MESSAGES_STORAGE_KEY)
    if (!stored) return []
    
    const messages = JSON.parse(stored) as StoredMessage[]
    return messages
  } catch (error) {
    console.error('Error loading messages from localStorage:', error)
    return []
  }
}

// Clear messages from localStorage
export function clearMessages(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(MESSAGES_STORAGE_KEY)
  } catch (error) {
    console.error('Error clearing messages from localStorage:', error)
  }
}

// Save user context to localStorage
export function saveUserContext(context: UserContext): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(USER_CONTEXT_STORAGE_KEY, JSON.stringify(context))
  } catch (error) {
    console.error('Error saving user context to localStorage:', error)
  }
}

// Load user context from localStorage
export function loadUserContext(): UserContext | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(USER_CONTEXT_STORAGE_KEY)
    if (!stored) return null
    
    return JSON.parse(stored) as UserContext
  } catch (error) {
    console.error('Error loading user context from localStorage:', error)
    return null
  }
}

// Update user context (merge with existing)
export function updateUserContext(updates: Partial<UserContext>): void {
  if (typeof window === 'undefined') return
  
  const existing = loadUserContext() || {}
  const updated = {
    ...existing,
    ...updates,
    preferences: {
      ...existing.preferences,
      ...updates.preferences,
    },
    metadata: {
      ...existing.metadata,
      ...updates.metadata,
    },
  }
  
  saveUserContext(updated)
}

// Extract user information from conversation
export function extractUserInfoFromMessages(messages: StoredMessage[]): Partial<UserContext> {
  const userInfo: Partial<UserContext> = {}
  
  // Look for name mentions in messages
  const namePatterns = [
    /benim adım (.+?)(?:\.|$|,|\s|$)/i,
    /adım (.+?)(?:\.|$|,|\s|$)/i,
    /ben (.+?)(?:yim|ım|um|üm)(?:\.|$|,|\s|$)/i,
    /my name is (.+?)(?:\.|$|,|\s|$)/i,
    /i'm (.+?)(?:\.|$|,|\s|$)/i,
    /i am (.+?)(?:\.|$|,|\s|$)/i,
  ]
  
  for (const message of messages) {
    if (message.role === 'user') {
      for (const pattern of namePatterns) {
        const match = message.content.match(pattern)
        if (match && match[1]) {
          const name = match[1].trim()
          if (name.length > 1 && name.length < 50) {
            userInfo.name = name
            break
          }
        }
      }
    }
  }
  
  return userInfo
}

