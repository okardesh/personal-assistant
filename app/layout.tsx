import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wise Assistant',
  description: 'Your intelligent personal assistant',
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

