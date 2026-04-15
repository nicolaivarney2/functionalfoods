'use client'

import Script from 'next/script'
import { useCallback } from 'react'
import { useCookieConsent } from '@/contexts/CookieConsentContext'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? ''
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? ''

/**
 * Indlæser GA4 + Meta Pixel først efter cookie-samtykke.
 * Page views sendes fra AnalyticsProvider når `marketingTagsReady` er true.
 */
export default function ConsentGatedMarketingScripts() {
  const { consent, notifyMarketingTagsReady } = useCookieConsent()

  const onGaInlineReady = useCallback(() => {
    if (!META_PIXEL_ID) notifyMarketingTagsReady()
  }, [META_PIXEL_ID, notifyMarketingTagsReady])

  const onMetaReady = useCallback(() => {
    if (META_PIXEL_ID) notifyMarketingTagsReady()
  }, [META_PIXEL_ID, notifyMarketingTagsReady])

  if (consent !== 'accepted') return null
  if (!GA_MEASUREMENT_ID && !META_PIXEL_ID) return null

  return (
    <>
      {GA_MEASUREMENT_ID ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-config-consent" strategy="afterInteractive" onLoad={onGaInlineReady}>
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = window.gtag || gtag;
              gtag('js', new Date());
              gtag('config', ${JSON.stringify(GA_MEASUREMENT_ID)}, { send_page_view: false });
            `}
          </Script>
        </>
      ) : null}
      {META_PIXEL_ID ? (
        <Script id="meta-pixel-consent" strategy="afterInteractive" onLoad={onMetaReady}>
          {`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', ${JSON.stringify(META_PIXEL_ID)});
          `}
        </Script>
      ) : null}
      {META_PIXEL_ID ? (
        <noscript>
          <img
            alt=""
            height={1}
            width={1}
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${encodeURIComponent(META_PIXEL_ID)}&ev=PageView&noscript=1`}
          />
        </noscript>
      ) : null}
    </>
  )
}
