import type { Metadata } from 'next'
import { Space_Grotesk, Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '600', '700'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'CleverProfits Tools',
    template: '%s — CleverProfits Tools',
  },
  description: 'Internal tools platform for CleverProfits',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${spaceGrotesk.variable} ${inter.variable} font-sans h-full antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
