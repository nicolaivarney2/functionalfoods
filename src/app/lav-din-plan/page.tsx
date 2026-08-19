import type { Metadata } from 'next'
import VaegttabsplanOnboardingFlow from '@/components/onboarding/VaegttabsplanOnboardingFlow'
import ReferralCapture from '@/components/ReferralCapture'

export const metadata: Metadata = {
  title: 'Lav din vægttabsplan | Functional Foods',
  description:
    'Guides igennem profil, mål og butikker — opret gratis og få din personlige madplan ud fra ugens tilbud.',
}

export default function LavDinPlanPage() {
  return (
    <>
      <ReferralCapture />
      <VaegttabsplanOnboardingFlow />
    </>
  )
}
