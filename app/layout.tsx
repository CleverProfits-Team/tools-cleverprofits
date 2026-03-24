import type { Metadata } from 'next'
import { DM_Sans, Syne } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
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
      <body className={`${dmSans.variable} ${syne.variable} font-sans h-full antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
