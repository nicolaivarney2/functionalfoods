'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import PartnerInviteShare from '@/components/PartnerInviteShare'

type HouseholdPayload = {
  accountKind: 'primary' | 'partner'
  owner: { id: string; email: string | null; name: string }
  partner: { id: string; email: string | null; name: string } | null
  pendingInvite: { email: string; inviteUrl: string; expiresAt: string } | null
}

export default function PartnerInvitePanel() {
  const { user } = useAuth()
  const [data, setData] = useState<HouseholdPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/household')
    if (!res.ok) return
    setData((await res.json()) as HouseholdPayload)
  }, [])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  if (!user || !data) return null

  async function createLink() {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/household', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Kunne ikke oprette linket.')
      setMessage('Linket er klar. Send det til din partner via SMS, mail eller Del.')
      await load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Der opstod en fejl.')
    } finally {
      setLoading(false)
    }
  }

  async function remove(action: 'partner' | 'invite' | 'leave') {
    setLoading(true)
    try {
      const res = await fetch(`/api/household?action=${action}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Kunne ikke opdatere.')
      await load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Der opstod en fejl.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5">
      <div className="mb-4 flex items-center gap-3">
        <Users className="h-5 w-5 text-emerald-700" />
        <h2 className="text-lg font-semibold">
          {data.accountKind === 'partner' || data.partner
            ? 'Partner'
            : data.pendingInvite
              ? 'Invitationslink'
              : 'Inviter din partner (gratis)'}
        </h2>
      </div>
      {data.accountKind === 'partner' ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Du er en partner-bruger til {data.owner.name}. I kan redigere i samme madplan, men
            har hver jeres madlog.
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => remove('leave')}
            className="text-sm text-red-600 underline"
          >
            Forlad husstanden
          </button>
        </div>
      ) : data.partner ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Partner: {data.partner.name} ({data.partner.email}). I redigerer samme madplan og
            har hver jeres madlog.
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => remove('partner')}
            className="text-sm text-red-600 underline"
          >
            Fjern partner
          </button>
        </div>
      ) : data.pendingInvite ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Send linket til din partner. De opretter deres eget login — uden at vente på e-mail fra
            os.
          </p>
          <PartnerInviteShare
            inviteUrl={data.pendingInvite.inviteUrl}
            inviterName={data.owner.name}
            productName="Functional Foods"
          />
          <button type="button" className="text-sm text-red-600 underline" onClick={() => remove('invite')}>
            Annullér invitation
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Inviter én partner. I får hver jeres login og madlog, men samme madplan, indkøbsliste og
            familieindstillinger. Du får et link, du selv sender via SMS, mail eller Del.
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void createLink()}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Opretter link…' : 'Lav invitationslink'}
          </button>
        </div>
      )}
      {message ? <p className="mt-3 text-sm text-gray-700">{message}</p> : null}
    </div>
  )
}
