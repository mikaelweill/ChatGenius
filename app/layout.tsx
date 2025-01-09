import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ActivityTracker } from '@/components/ActivityTracker'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ChatGenius',
  description: 'A modern chat application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <ActivityTracker />
      </body>
    </html>
  )
}