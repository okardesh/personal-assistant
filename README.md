# Personal Assistant Web App

A modern, intelligent personal assistant web application that integrates with your calendars, emails, and location services.

## Features

- 🤖 **AI-Powered**: Powered by OpenAI GPT for intelligent, conversational responses
- 📅 **Calendar Integration**: Access to both Apple Calendar and Outlook calendars
- 📧 **Email Access**: View and manage emails from multiple providers
- 🌤️ **Weather Information**: Get current weather for your location or any city
- 📍 **Location Services**: Get your current location and location-based information
- 💬 **Chat Interface**: Natural language command interface similar to ChatGPT
- 🎨 **Modern UI**: Beautiful, responsive design with dark mode support
- 🔄 **Function Calling**: AI can automatically call calendar, email, and weather functions
- 🔊 **Amazon Alexa Integration**: Voice commands through Alexa Skills Kit

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **AI**: OpenAI GPT-4o-mini (configurable)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Access to your calendars and email accounts (for OAuth setup)

### Quick Deploy to Vercel

For a quick deployment guide, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md). This includes all the information you need to deploy to Vercel, including Alexa integration setup.

### Installation

1. Clone the repository and navigate to the project directory:
```bash
cd personal-assistant
```

2. Install dependencies:
```bash
npm install
```

3. **Set up OpenAI API** (Required for AI features):
   - Get your API key from [OpenAI Platform](https://platform.openai.com/)
   - See [SETUP_OPENAI.md](./SETUP_OPENAI.md) for detailed instructions

4. Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# OpenAI API (Required for AI features)
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini  # Optional: defaults to gpt-4o-mini

# Apple Calendar (CalDAV) - Optional
APPLE_CALENDAR_URL=
APPLE_CALENDAR_USERNAME=
APPLE_CALENDAR_PASSWORD=

# Microsoft Outlook (Graph API) - Optional
OUTLOOK_CLIENT_ID=
OUTLOOK_CLIENT_SECRET=
OUTLOOK_TENANT_ID=

# Email Provider Settings - Optional
EMAIL_PROVIDER=gmail|outlook|imap
EMAIL_IMAP_HOST=
EMAIL_IMAP_USER=
EMAIL_IMAP_PASSWORD=

# Gmail API - Optional
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=

# Geocoding API (for address lookup) - Optional
GEOCODING_API_KEY=
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Setup Instructions

### Calendar Integration

See [SETUP_CALENDARS.md](./SETUP_CALENDARS.md) for detailed setup instructions.

#### Apple Calendar

Apple Calendar integration uses CalDAV protocol:

1. Create an app-specific password from [Apple ID](https://appleid.apple.com/)
2. Add to `.env.local`:
```env
APPLE_CALENDAR_URL=https://caldav.icloud.com
APPLE_CALENDAR_USERNAME=your-apple-id@icloud.com
APPLE_CALENDAR_PASSWORD=your-app-specific-password
```

**Note**: Always use an app-specific password, never your main Apple ID password.

#### Outlook Calendar

Outlook integration uses Microsoft Graph API with OAuth 2.0:

1. Register an application in [Azure Portal](https://portal.azure.com)
2. Add API permissions: `Calendars.Read` and `offline_access`
3. Create a client secret
4. Complete OAuth flow by visiting: `http://localhost:3000/api/auth/microsoft`
5. Add to `.env.local`:
```env
OUTLOOK_CLIENT_ID=your-client-id
OUTLOOK_CLIENT_SECRET=your-client-secret
OUTLOOK_TENANT_ID=your-tenant-id-or-common
OUTLOOK_REFRESH_TOKEN=your-refresh-token-from-oauth
```

See [SETUP_CALENDARS.md](./SETUP_CALENDARS.md) for step-by-step instructions.

### Email Integration

#### Gmail

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable Gmail API
3. Create OAuth 2.0 credentials
4. Add to `.env.local`:
```env
EMAIL_PROVIDER=gmail
GMAIL_CLIENT_ID=your-client-id
GMAIL_CLIENT_SECRET=your-client-secret
```

#### Outlook Email

Uses the same Microsoft Graph API setup as Outlook Calendar. The same credentials will work for both.

#### IMAP (Generic)

For other email providers:
```env
EMAIL_PROVIDER=imap
EMAIL_IMAP_HOST=imap.example.com
EMAIL_IMAP_USER=your-email@example.com
EMAIL_IMAP_PASSWORD=your-password
```

### OpenAI Integration (Required)

The app uses OpenAI GPT for intelligent responses. You must set up an API key:

1. Get your API key from [OpenAI Platform](https://platform.openai.com/)
2. Add to `.env.local`:
```env
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini  # Optional: defaults to gpt-4o-mini
```

See [SETUP_OPENAI.md](./SETUP_OPENAI.md) for detailed setup instructions.

### Weather Integration

The app uses OpenWeatherMap API for weather information:

1. Sign up for a free API key at [OpenWeatherMap](https://openweathermap.org/api)
2. Add to `.env.local`:
```env
OPENWEATHER_API_KEY=your-openweather-api-key
```

**Note**: Free tier allows 60 calls/minute and 1,000,000 calls/month - more than enough for personal use.

### Location Services

Location services use the browser's Geolocation API. No additional setup is required, but users will need to grant location permissions when prompted.

For reverse geocoding (getting addresses from coordinates), you can optionally add a geocoding API key:
```env
GEOCODING_API_KEY=your-api-key
```

### Amazon Alexa Integration

The app includes an Alexa Skills Kit endpoint that allows you to interact with your personal assistant through Amazon Alexa devices.

See [SETUP_ALEXA.md](./SETUP_ALEXA.md) for detailed setup instructions.

#### Quick Setup

1. **Deploy your application** to a public URL (e.g., Vercel, AWS, etc.)
   - The endpoint will be available at: `https://your-domain.com/api/alexa`

2. **Create an Alexa Skill** in the [Amazon Developer Console](https://developer.amazon.com/alexa/console/ask):
   - Go to [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask)
   - Click "Create Skill"
   - Choose "Custom" model
   - Choose "Provision your own" hosting
   - Select your language (e.g., Turkish, English)

3. **Configure the Skill**:
   - **Invocation Name**: Choose a name users will say to activate your skill (e.g., "kişisel asistanım", "my personal assistant")
   - **Endpoint**: Set the endpoint URL to `https://your-domain.com/api/alexa`
   - **Default Region**: Select your region

4. **Configure Intents** (Optional - the skill works with a catch-all intent):
   - The skill uses a flexible intent system that processes natural language
   - You can add custom intents or use the built-in ones:
     - `AMAZON.CancelIntent` - Cancel/stop
     - `AMAZON.StopIntent` - Stop
     - `AMAZON.HelpIntent` - Get help

5. **Build and Test**:
   - Click "Build Model" in the Alexa Developer Console
   - Use the "Test" tab to test your skill
   - You can test with text input or voice

6. **Publish** (Optional):
   - Once tested, you can submit for certification to publish to the Alexa Skills Store
   - Or keep it as a development skill for personal use

#### Usage Examples

Once set up, users can interact with your assistant through Alexa:

- **"Alexa, open [your skill name]"** - Opens the skill
- **"Takvimimi göster"** - Shows calendar
- **"Bugünkü randevularım neler?"** - What are my appointments today?
- **"E-postalarımı kontrol et"** - Check my emails
- **"Hava durumu nasıl?"** - What's the weather like?
- **"Yarınki toplantılarım"** - Tomorrow's meetings

#### Technical Details

- The Alexa endpoint (`/api/alexa`) receives JSON requests from Amazon Alexa
- It processes the user's spoken command using the same OpenAI-powered assistant
- Responses are formatted for Alexa's text-to-speech output
- Session attributes maintain conversation context across interactions

#### Security Notes

- In production, you should verify Alexa request signatures
- Consider implementing user authentication for multi-user scenarios
- The endpoint should be accessible via HTTPS

## Usage

### Commands

The assistant understands natural language commands:

**Calendar:**
- "Show my calendar"
- "What meetings do I have today?"
- "Events this week"
- "What's on my calendar tomorrow?"

**Email:**
- "Check my emails"
- "Show unread emails"
- "What's in my inbox?"

**Weather:**
- "What's the weather like?"
- "How's the weather today?"
- "What's the weather in Istanbul?"
- "Is it going to rain?"

**Location:**
- "Where am I?"
- "What's my location?"

## Project Structure

```
personal-assistant/
├── app/
│   ├── api/
│   │   ├── assistant/     # Main assistant API endpoint
│   │   ├── alexa/         # Amazon Alexa Skills Kit endpoint
│   │   ├── calendar/      # Calendar integration API
│   │   ├── email/         # Email integration API
│   │   └── location/      # Location API
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/
│   └── ChatInterface.tsx  # Chat UI component
├── lib/
│   ├── alexa.ts           # Alexa request/response processing
│   ├── calendar.ts        # Calendar utilities
│   ├── commandProcessor.ts # Command processing logic
│   ├── email.ts           # Email utilities
│   ├── location.ts        # Location utilities (server)
│   └── locationClient.ts  # Location utilities (client)
├── types/
│   ├── alexa.ts           # Alexa Skills Kit types
│   └── chat.ts            # TypeScript types
└── package.json
```

## Development

### Adding New Integrations

1. Create API route in `app/api/`
2. Add utility functions in `lib/`
3. Update `lib/commandProcessor.ts` to handle new commands
4. Add environment variables to `.env.local`

### Customizing the UI

- Modify `components/ChatInterface.tsx` for chat UI changes
- Update `app/globals.css` for global styling
- Tailwind classes can be modified in `tailwind.config.js`

## Security Notes

- Never commit `.env.local` to version control
- Use app-specific passwords for Apple Calendar
- Store OAuth tokens securely (consider using a database)
- Implement proper authentication for production use
- Use HTTPS in production

## Next Steps

To make this production-ready, consider:

1. **Authentication**: Add user authentication (NextAuth.js, Auth0, etc.)
2. **Database**: Store user preferences and tokens securely
3. **OAuth Flow**: Implement proper OAuth flows for calendar/email access
4. **Error Handling**: Enhanced error handling and user feedback
5. **Caching**: Cache calendar/email data for better performance
6. **AI Integration**: Add OpenAI/Claude API for more intelligent responses
7. **Voice Input**: Add speech-to-text capabilities
8. **Notifications**: Real-time notifications for calendar events

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

