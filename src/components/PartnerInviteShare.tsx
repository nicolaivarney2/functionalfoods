'use client'

import { useState } from 'react'

type Props = {
  inviteUrl: string
  inviterName?: string
  productName: string
}

function shareMessage(url: string, productName: string, inviterName?: string) {
  const who = inviterName?.trim() || 'Jeg'
  return `${who} inviterer dig til at dele madplanen på ${productName}. Åbn linket og opret dit partner-login:\n${url}`
}

export default function PartnerInviteShare({ inviteUrl, inviterName, productName }: Props) {
  const [copied, setCopied] = useState(false)
  const text = shareMessage(inviteUrl, productName, inviterName)

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  async function nativeShare() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `${productName} partner`, text, url: inviteUrl })
        return
      } catch {
        /* user cancelled */
      }
    }
    await copy()
  }

  const smsHref = `sms:?&body=${encodeURIComponent(text)}`
  const mailHref = `mailto:?subject=${encodeURIComponent(`Invitation til ${productName}`)}&body=${encodeURIComponent(text)}`

  return (
    <div className="space-y-3">
      <p className="break-all rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">{inviteUrl}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void nativeShare()}
          className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white"
        >
          Del
        </button>
        <a href={smsHref} className="rounded-lg border px-3 py-2 text-sm font-semibold">
          Åbn i SMS
        </a>
        <a href={mailHref} className="rounded-lg border px-3 py-2 text-sm font-semibold">
          Åbn i mail
        </a>
        <button type="button" onClick={() => void copy()} className="rounded-lg border px-3 py-2 text-sm font-semibold">
          {copied ? 'Kopieret' : 'Kopiér link'}
        </button>
      </div>
    </div>
  )
}
