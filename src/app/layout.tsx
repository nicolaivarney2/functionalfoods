import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { CookieConsentProvider } from '@/contexts/CookieConsentContext'
import ConsentGatedMarketingScripts from '@/components/ConsentGatedMarketingScripts'
import CookieConsentBanner from '@/components/CookieConsentBanner'
import { AnalyticsProvider } from '@/components/AnalyticsProvider'
import { AuthProvider } from '@/contexts/AuthContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import MessengerHumanGuidanceWidget from '@/components/MessengerHumanGuidanceWidget'
import SoftLaunchBanner from '@/components/SoftLaunchBanner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://functionalfoods.dk'),
  title: 'Functional Foods - Sunde opskrifter til vægttab og en sund livsstil',
  description: 'Opskrifter til vægttab og en sund livsstil. Keto, LCHF og sunde opskrifter til hverdagen.',
  keywords: 'keto opskrifter, vægttab, sunde opskrifter, LCHF, danske opskrifter, funktionelle fødevarer',
  icons: {
    icon: [
      {
        url: '/billeder/favicon/ff-logo%20favicon%20white%20logo.jpg.png',
        type: 'image/png',
      },
    ],
    shortcut: '/billeder/favicon/ff-logo%20favicon%20white%20logo.jpg.png',
    apple: '/billeder/favicon/ff-logo%20favicon%20white%20logo.jpg.png',
  },
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
        <CookieConsentProvider>
          <ConsentGatedMarketingScripts />
          <div className="min-h-screen bg-white">
            <AnalyticsProvider>
              <AuthProvider>
                <Header />
                <SoftLaunchBanner />
                {children}
                <Footer />
                <MessengerHumanGuidanceWidget />
              </AuthProvider>
            </AnalyticsProvider>
          </div>
          <CookieConsentBanner />
        </CookieConsentProvider>
      </body>
    </html>
  )
} 