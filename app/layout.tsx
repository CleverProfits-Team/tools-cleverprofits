import type { Metadata } from 'next'
import { Inter, DM_Sans } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: {
    default: 'CleverProfits Tools',
    template: '%s — CleverProfits Tools',
  },
  description: 'Internal tools platform for CleverProfits',
  robots: { index: false, follow: false },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} ${dmSans.variable} font-sans h-full antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
