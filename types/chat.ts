export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  spotifyAction?: {
    action: string
    query?: string
    control?: string
  }
}

