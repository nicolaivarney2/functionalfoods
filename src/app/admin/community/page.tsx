'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'

import { DIETARY_APPROACH_OPTIONS, dietaryApproachLabel } from '@/lib/dietary-approach-options'
import { nextMondayIso } from '@/lib/community/shared'
import type { CommunityRoomRow, CommunityTemplateRow } from '@/lib/community/shared'
import { useAdminAuth } from '@/hooks/useAdminAuth'

export default function AdminCommunityPage() {
  const { isAdmin, checking } = useAdminAuth()
  const [rooms, setRooms] = useState<CommunityRoomRow[]>([])
  const [templates, setTemplates] = useState<CommunityTemplateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [niche, setNiche] = useState('sense')
  const [startDate, setStartDate] = useState(nextMondayIso())
  const [capacity, setCapacity] = useState(8)
  const [title, setTitle] = useState('')
  const [savingRoom, setSavingRoom] = useState(false)
  const [draftDay, setDraftDay] = useState('3')
  const [draftBody, setDraftBody] = useState('')
  const [draftTrigger, setDraftTrigger] = useState<'on_join' | 'day'>('day')
  const [savingTpl, setSavingTpl] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    const res = await fetch('/api/admin/community')
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Kunne ikke hente community')
    setRooms(json.rooms ?? [])
    setTemplates(json.templates ?? [])
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    setLoading(true)
    load()
      .catch((e) => setError(e instanceof Error ? e.message : 'Fejl'))
      .finally(() => setLoading(false))
  }, [isAdmin, load])

  const nicheTemplates = useMemo(
    () =>
      templates
        .filter((t) => t.niche === niche)
        .sort((a, b) => {
          if (a.trigger !== b.trigger) return a.trigger === 'on_join' ? -1 : 1
          return (a.day_offset ?? 0) - (b.day_offset ?? 0)
        }),
    [templates, niche]
  )

  const createRoom = async () => {
    setSavingRoom(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'room',
          niche,
          startDate,
          capacity,
          title: title.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Kunne ikke oprette rum')
      setTitle('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fejl')
    } finally {
      setSavingRoom(false)
    }
  }

  const archiveRoom = async (id: string) => {
    if (!confirm('Arkivér rummet? Deltagerne kan stadig læse, men ikke skrive.')) return
    const res = await fetch('/api/admin/community', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'archived' }),
    })
    if (!res.ok) {
      const json = await res.json()
      setError(json.error || 'Kunne ikke arkivere')
      return
    }
    await load()
  }

  const saveTemplate = async () => {
    if (!draftBody.trim()) return
    setSavingTpl(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'template',
          niche,
          trigger: draftTrigger,
          dayOffset: draftTrigger === 'day' ? Number(draftDay) : null,
          body: draftBody,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Kunne ikke gemme skabelon')
      setDraftBody('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fejl')
    } finally {
      setSavingTpl(false)
    }
  }

  const removeTemplate = async (id: string) => {
    if (!confirm('Slet denne guidance-besked?')) return
    const res = await fetch(`/api/admin/community?templateId=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json()
      setError(json.error || 'Kunne ikke slette')
      return
    }
    await load()
  }

  if (checking) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Tjekker admin adgang...
      </div>
    )
  }
  if (!isAdmin) return null

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Community</h1>
        <p className="mt-1 text-sm text-gray-600">
          Opret rum pr. niche og rediger de beskeder systemet poster på dag 0, 3, 6… Variabler:{' '}
          <code>{'{{niche}}'}</code>, <code>{'{{members}}'}</code>, <code>{'{{start_date}}'}</code>.
        </p>
      </div>

      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <label className="block max-w-xs text-sm font-medium text-gray-700">
        Niche
        <select
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
        >
          {DIETARY_APPROACH_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Nyt rum</h2>
          <p className="mb-4 text-sm text-gray-500">Ét rum om ugen er nok i starten. Start er typisk næste mandag.</p>
          <div className="space-y-3">
            <label className="block text-sm">
              Startdato
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Kapacitet
              <input
                type="number"
                min={2}
                max={20}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </label>
            <label className="block text-sm">
              Titel (valgfri)
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`${dietaryApproachLabel(niche)} · uge`}
              />
            </label>
            <button
              type="button"
              onClick={() => void createRoom()}
              disabled={savingRoom}
              className="inline-flex items-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {savingRoom ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Opret rum
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Guidance for {dietaryApproachLabel(niche)}</h2>
          <div className="mt-3 space-y-3">
            <div className="flex gap-2">
              <select
                className="rounded-md border border-gray-300 px-2 py-2 text-sm"
                value={draftTrigger}
                onChange={(e) => setDraftTrigger(e.target.value as 'on_join' | 'day')}
              >
                <option value="on_join">Ved join (velkomst)</option>
                <option value="day">På dag #</option>
              </select>
              {draftTrigger === 'day' ? (
                <input
                  type="number"
                  min={0}
                  className="w-24 rounded-md border border-gray-300 px-2 py-2 text-sm"
                  value={draftDay}
                  onChange={(e) => setDraftDay(e.target.value)}
                />
              ) : null}
            </div>
            <textarea
              className="h-28 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              placeholder="Besked til rummet…"
            />
            <button
              type="button"
              onClick={() => void saveTemplate()}
              disabled={savingTpl}
              className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {savingTpl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Tilføj / erstat
            </button>
          </div>
          <ul className="mt-5 space-y-3">
            {nicheTemplates.map((t) => (
              <li key={t.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-800">
                    {t.trigger === 'on_join' ? 'Velkomst' : `Dag ${t.day_offset}`}
                  </span>
                  <button type="button" onClick={() => void removeTemplate(t.id)} className="text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-gray-700">{t.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">Rum</h2>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2 pr-4">Niche</th>
                  <th className="py-2 pr-4">Start</th>
                  <th className="py-2 pr-4">Pladser</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Handling</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="py-2 pr-4">{dietaryApproachLabel(r.niche)}</td>
                    <td className="py-2 pr-4">{r.start_date}</td>
                    <td className="py-2 pr-4">
                      {r.member_count}/{r.capacity}
                    </td>
                    <td className="py-2 pr-4">{r.status}</td>
                    <td className="py-2">
                      {r.status !== 'archived' ? (
                        <button type="button" className="text-red-700 underline" onClick={() => void archiveRoom(r.id)}>
                          Arkivér
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
                {rooms.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-gray-500">
                      Ingen rum endnu.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
