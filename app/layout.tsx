import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} font-sans h-full antialiased`}>
        {/*
          SessionProvider must wrap the entire app so that useSession() works
          in any Client Component. It does not affect Server Components.
        */}
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
