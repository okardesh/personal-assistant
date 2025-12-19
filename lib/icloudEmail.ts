// iCloud Email integration using IMAP protocol

import Imap from 'imap'
import { simpleParser } from 'mailparser'

interface Email {
  id: string
  subject: string
  from: string
  date: string
  snippet?: string
  unread?: boolean
}

interface EmailOptions {
  unread?: boolean
  limit?: number
}

// Logging helper
function log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [EMAIL-${level.toUpperCase()}]`
  console[level](prefix, message, data ? JSON.stringify(data, null, 2) : '')
}

export async function fetchICloudEmails(options: EmailOptions = {}): Promise<Email[]> {
  log('info', 'Starting email fetch', { options })
  
  const imapHost = process.env.ICLOUD_IMAP_HOST || 'imap.mail.me.com'
  const imapPort = parseInt(process.env.ICLOUD_IMAP_PORT || '993')
  const username = process.env.ICLOUD_EMAIL_USERNAME || process.env.APPLE_CALENDAR_USERNAME
  const password = process.env.ICLOUD_EMAIL_PASSWORD || process.env.APPLE_CALENDAR_PASSWORD

  if (!username || !password) {
    log('warn', 'Email credentials not configured')
    return []
  }

  log('info', 'IMAP connection config', { host: imapHost, port: imapPort, username })

  return new Promise((resolve, reject) => {
    let timeout: NodeJS.Timeout | null = null
    let isResolved = false
    const startTime = Date.now()
    
    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
    }
    
    const safeResolve = (value: Email[]) => {
      if (!isResolved) {
        isResolved = true
        const duration = Date.now() - startTime
        log('info', `Email fetch completed in ${duration}ms`, { count: value.length })
        cleanup()
        resolve(value)
      }
    }
    
    const safeReject = (error: Error) => {
      if (!isResolved) {
        isResolved = true
        const duration = Date.now() - startTime
        log('error', `Email fetch failed after ${duration}ms`, { error: error.message })
        cleanup()
        try {
          imap.end()
        } catch (e) {
          // Ignore
        }
        reject(error)
      }
    }
    
    log('info', 'Creating IMAP connection')
    const imap = new Imap({
      user: username,
      password: password,
      host: imapHost,
      port: imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 8000,
      authTimeout: 8000,
    })

    const emails: Email[] = []

    imap.once('ready', () => {
      log('info', 'IMAP connection ready')
      cleanup()
      
      log('info', 'Opening INBOX')
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          log('error', 'Failed to open INBOX', { error: err.message })
          safeReject(err)
          return
        }

        log('info', 'INBOX opened', { messages: box.messages.total })

        // Build search criteria - always get ALL emails first, then filter and sort
        // IMAP search returns UIDs in ascending order (oldest first), so we need to reverse
        const searchCriteria: any[] = ['ALL']
        log('info', 'Searching for all emails (will filter and sort by date)')

        imap.search(searchCriteria, (err, results) => {
          if (err) {
            log('error', 'Email search failed', { error: err.message })
            safeReject(err)
            return
          }

          log('info', 'Search completed', { resultCount: results?.length || 0 })

          if (!results || results.length === 0) {
            log('info', 'No emails found')
            safeResolve([])
            return
          }

          // Reverse to get newest first (IMAP returns oldest first)
          const reversedResults = [...results].reverse()
          
          // Limit results - take from the end (newest emails)
          const messageIds = reversedResults.slice(0, options.limit || 10)
          log('info', 'Fetching emails', { total: results.length, fetching: messageIds.length, reversed: true })

          if (messageIds.length === 0) {
            safeResolve([])
            return
          }

          // Fetch emails - use HEADER for faster response
          const fetch = imap.fetch(messageIds, {
            bodies: 'HEADER',
            struct: true,
          })

          let processed = 0
          const total = messageIds.length
          
          // Safety timeout for fetch operation
          const fetchTimeout = setTimeout(() => {
            log('warn', 'Email fetch timeout - returning partial results', { processed, total })
            safeResolve(emails.length > 0 ? emails : [])
          }, 12000)

          fetch.on('message', (msg, seqno) => {
            log('info', `Processing message ${seqno}`)
            let email: Partial<Email> = {}
            let headerBuffer = ''
            let headerComplete = false
            let attributesReceived = false

            const finalizeEmail = () => {
              if (email.id && !emails.find(e => e.id === email.id)) {
                if (!email.subject) email.subject = '(No Subject)'
                if (!email.from) email.from = 'Unknown'
                if (!email.date) email.date = new Date().toISOString()
                
                emails.push(email as Email)
                processed++
                log('info', `Email ${processed}/${total} processed`, { id: email.id, subject: email.subject })
                
                if (processed === total) {
                  clearTimeout(fetchTimeout)
                  safeResolve(emails)
                }
              }
            }

            msg.on('body', (stream, info) => {
              stream.on('data', (chunk) => {
                headerBuffer += chunk.toString('utf8')
              })
              stream.once('end', () => {
                headerComplete = true
                // Parse header
                const subjectMatch = headerBuffer.match(/^Subject: (.+)$/im)
                const fromMatch = headerBuffer.match(/^From: (.+)$/im)
                const dateMatch = headerBuffer.match(/^Date: (.+)$/im)

                email.subject = subjectMatch ? subjectMatch[1].trim() : '(No Subject)'
                email.from = fromMatch ? fromMatch[1].trim() : 'Unknown'
                email.date = dateMatch ? dateMatch[1].trim() : new Date().toISOString()
                
                log('info', `Header parsed for message ${seqno}`, { subject: email.subject, from: email.from })
                
                // Finalize if attributes already received
                if (attributesReceived) {
                  finalizeEmail()
                }
              })
            })

            msg.once('attributes', (attrs) => {
              attributesReceived = true
              const uid = attrs.uid
              email.id = `icloud-${uid}`
              email.unread = !attrs.flags?.includes('\\Seen')
              
              log('info', `Attributes received for message ${seqno}`, { uid, unread: email.unread })
              
              // Finalize if header already received
              if (headerComplete) {
                finalizeEmail()
              }
            })

            msg.once('end', () => {
              log('info', `Message ${seqno} ended`)
              // Finalize email if not already done
              finalizeEmail()
            })
          })

          fetch.once('error', (err) => {
            log('error', 'Fetch error', { error: err.message })
            clearTimeout(fetchTimeout)
            safeReject(err)
          })
          
          fetch.once('end', () => {
            log('info', 'Fetch ended', { processed, total })
            clearTimeout(fetchTimeout)
            
            // If fetch completes but we haven't processed all emails, continue with what we have
            if (processed < total) {
              log('warn', 'Not all emails processed', { processed, total })
            }
            
            // Sort emails by date (newest first)
            emails.sort((a, b) => {
              try {
                const dateA = new Date(a.date).getTime()
                const dateB = new Date(b.date).getTime()
                if (isNaN(dateA) || isNaN(dateB)) {
                  log('warn', 'Invalid date found in email', { dateA: a.date, dateB: b.date })
                  return 0
                }
                return dateB - dateA // Newest first
              } catch (e) {
                log('warn', 'Error sorting emails by date', { error: e instanceof Error ? e.message : 'Unknown' })
                return 0
              }
            })
            
            // Filter by unread if requested
            let filteredEmails = emails
            if (options.unread) {
              filteredEmails = emails.filter(e => e.unread)
              log('info', 'Filtered by unread', { total: emails.length, unread: filteredEmails.length })
            }
            
            // Apply limit after filtering
            if (filteredEmails.length > (options.limit || 10)) {
              filteredEmails = filteredEmails.slice(0, options.limit || 10)
            }
            
            log('info', 'Final email list', { 
              total: emails.length, 
              filtered: filteredEmails.length,
              dates: filteredEmails.map(e => ({ subject: e.subject, date: e.date, unread: e.unread }))
            })
            
            safeResolve(filteredEmails)
          })
        })
      })
    })

    imap.once('error', (err) => {
      log('error', 'IMAP connection error', { error: err.message })
      safeReject(err)
    })

    imap.once('end', () => {
      log('info', 'IMAP connection ended')
      cleanup()
    })

    // Set timeout before connecting
    timeout = setTimeout(() => {
      log('error', 'IMAP connection timeout')
      safeReject(new Error('IMAP connection timeout - email server may be slow or unreachable'))
    }, 10000)

    try {
      log('info', 'Connecting to IMAP server')
      imap.connect()
    } catch (error) {
      log('error', 'Failed to connect', { error: error instanceof Error ? error.message : 'Unknown' })
      safeReject(error instanceof Error ? error : new Error('Failed to connect to IMAP server'))
    }
  })
}

// Function to get full email body for summarization
export async function fetchICloudEmailBody(emailId: string): Promise<string | null> {
  log('info', 'Fetching email body', { emailId })
  
  const imapHost = process.env.ICLOUD_IMAP_HOST || 'imap.mail.me.com'
  const imapPort = parseInt(process.env.ICLOUD_IMAP_PORT || '993')
  const username = process.env.ICLOUD_EMAIL_USERNAME || process.env.APPLE_CALENDAR_USERNAME
  const password = process.env.ICLOUD_EMAIL_PASSWORD || process.env.APPLE_CALENDAR_PASSWORD

  if (!username || !password) {
    log('warn', 'Email credentials not configured')
    return null
  }

  // Extract UID from email ID (format: icloud-12345)
  const uidStr = emailId.replace('icloud-', '')
  const uid = parseInt(uidStr)
  
  if (isNaN(uid)) {
    log('error', 'Invalid email ID format', { emailId, uidStr })
    return null
  }
  
  log('info', 'Extracted UID', { emailId, uid })

  return new Promise((resolve, reject) => {
    let timeout: NodeJS.Timeout | null = null
    let isResolved = false
    const startTime = Date.now()

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
    }

    const safeResolve = (value: string | null) => {
      if (!isResolved) {
        isResolved = true
        const duration = Date.now() - startTime
        log('info', `Email body fetch completed in ${duration}ms`, { length: value?.length || 0 })
        cleanup()
        resolve(value)
      }
    }

    const safeReject = (error: Error) => {
      if (!isResolved) {
        isResolved = true
        const duration = Date.now() - startTime
        log('error', `Email body fetch failed after ${duration}ms`, { error: error.message })
        cleanup()
        try {
          imap.end()
        } catch (e) {
          // Ignore
        }
        reject(error)
      }
    }

    const imap = new Imap({
      user: username,
      password: password,
      host: imapHost,
      port: imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 8000,
      authTimeout: 8000,
    })

    imap.once('ready', () => {
      log('info', 'IMAP connection ready for body fetch')
      cleanup()

      imap.openBox('INBOX', false, (err) => {
        if (err) {
          log('error', 'Failed to open INBOX for body fetch', { error: err.message })
          safeReject(err)
          return
        }

        log('info', 'Fetching email body', { uid })
        const fetch = imap.fetch([uid], { bodies: '' })

        let messageReceived = false
        let bodyTimeout: NodeJS.Timeout | null = null

        fetch.on('message', (msg) => {
          messageReceived = true
          let buffers: Buffer[] = []
          let bodyReceived = false
          let parsingComplete = false

          // Timeout for individual message processing
          bodyTimeout = setTimeout(() => {
            if (!parsingComplete) {
              log('warn', 'Email body parsing timeout')
              safeResolve(null)
            }
          }, 15000) // Increased timeout for parsing

          msg.on('body', (stream, info) => {
            log('info', 'Email body stream started', { which: info.which, size: info.size })
            stream.on('data', (chunk) => {
              buffers.push(chunk)
            })
            stream.once('end', async () => {
              bodyReceived = true
              
              // Wait for parsing to complete before resolving
              try {
                const bufferSize = Buffer.concat(buffers).length
                log('info', 'Parsing email body', { bufferSize })
                const fullBuffer = Buffer.concat(buffers)
                
                // Parse email - this is async
                const parsed = await simpleParser(fullBuffer)
                
                let text = parsed.text || ''
                if (!text && parsed.html) {
                  // Strip HTML tags more carefully
                  text = parsed.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                }
                
                parsingComplete = true
                if (bodyTimeout) {
                  clearTimeout(bodyTimeout)
                  bodyTimeout = null
                }
                
                // Only resolve after parsing is complete
                if (text && text.length > 0) {
                  log('info', 'Email body parsed successfully, resolving', { 
                    textLength: text.length,
                    hasText: !!parsed.text,
                    hasHtml: !!parsed.html,
                    preview: text.substring(0, 100)
                  })
                  safeResolve(text)
                } else {
                  log('warn', 'Email body parsed but text is empty', { 
                    hasText: !!parsed.text,
                    hasHtml: !!parsed.html
                  })
                  safeResolve(null)
                }
              } catch (parseError) {
                parsingComplete = true
                if (bodyTimeout) {
                  clearTimeout(bodyTimeout)
                  bodyTimeout = null
                }
                log('error', 'Error parsing email body', { 
                  error: parseError instanceof Error ? parseError.message : 'Unknown',
                  stack: parseError instanceof Error ? parseError.stack?.substring(0, 500) : undefined
                })
                safeResolve(null)
              }
            })
          })

          msg.once('end', () => {
            log('info', 'Email message ended')
            if (!bodyReceived && bodyTimeout) {
              clearTimeout(bodyTimeout)
              bodyTimeout = null
            }
          })
        })

        fetch.once('error', (err) => {
          log('error', 'Error fetching email body', { error: err.message })
          if (bodyTimeout) {
            clearTimeout(bodyTimeout)
            bodyTimeout = null
          }
          safeReject(err)
        })

        fetch.once('end', () => {
          log('info', 'Email body fetch ended', { messageReceived })
          // Don't resolve here - wait for stream.once('end') async parsing to complete
          // Only resolve if no message was received at all
          if (!isResolved && !messageReceived) {
            log('warn', 'No message received for email body fetch')
            if (bodyTimeout) {
              clearTimeout(bodyTimeout)
              bodyTimeout = null
            }
            safeResolve(null)
          }
          // If message was received, parsing will resolve in stream.once('end')
          // Don't clear timeout here - let parsing complete or timeout handle it
        })
      })
    })

    imap.once('error', (err) => {
      log('error', 'IMAP error during body fetch', { error: err.message })
      safeReject(err)
    })

    timeout = setTimeout(() => {
      log('error', 'Email body fetch timeout')
      safeReject(new Error('Timeout fetching email body'))
    }, 20000)

    try {
      log('info', 'Connecting to IMAP for body fetch')
      imap.connect()
    } catch (error) {
      log('error', 'Failed to connect for body fetch', { error: error instanceof Error ? error.message : 'Unknown' })
      safeReject(error instanceof Error ? error : new Error('Failed to connect to IMAP server'))
    }
  })
}
