import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AnalyticsProvider } from '@/components/AnalyticsProvider'
import { AuthProvider } from '@/contexts/AuthContext'
import Header from '@/components/Header'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://functionalfoods.dk'),
  title: 'Functional Foods - Sunde opskrifter til vægttab og en sund livsstil',
  description: 'Opskrifter til vægttab og en sund livsstil. Keto, LCHF og sunde opskrifter til hverdagen.',
  keywords: 'keto opskrifter, vægttab, sunde opskrifter, LCHF, danske opskrifter, funktionelle fødevarer',
  openGraph: {
    title: 'Functional Foods - Sunde opskrifter til vægttab',
    description: 'Opskrifter til vægttab og en sund livsstil. Keto, LCHF og sunde opskrifter til hverdagen.',
    type: 'website',
    locale: 'da_DK',
    siteName: 'Functional Foods',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="da">
      <body className={inter.className} suppressHydrationWarning={true}>
        <div className="min-h-screen bg-white">
          <AnalyticsProvider>
            <AuthProvider>
              <Header />
              {children}
            </AuthProvider>
          </AnalyticsProvider>
        </div>
      </body>
    </html>
  )
} 