'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'

import { DIETARY_APPROACH_OPTIONS, dietaryApproachLabel } from '@/lib/dietary-approach-options'
import { nextMondayIso } from '@/lib/community/shared'
import type { CommunityMessageRow, CommunityRoomRow, CommunityTemplateRow } from '@/lib/community/shared'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { authFetch } from '@/lib/auth-fetch'

export default function AdminCommunityPage() {
  const { isAdmin, checking } = useAdminAuth()
  const [rooms, setRooms] = useState<CommunityRoomRow[]>([])
  const [templates, setTemplates] = useState<CommunityTemplateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [niche, setNiche] = useState('sense')
  const [startDate, setStartDate] = useState(nextMondayIso())
  const [capacity, setCapacity] = useState(10)
  const [title, setTitle] = useState('')
  const [savingRoom, setSavingRoom] = useState(false)
  const [draftDay, setDraftDay] = useState('3')
  const [draftTime, setDraftTime] = useState('08:00')
  const [draftBody, setDraftBody] = useState('')
  const [draftTrigger, setDraftTrigger] = useState<'on_join' | 'day'>('day')
  const [savingTpl, setSavingTpl] = useState(false)
  const [chatRoomId, setChatRoomId] = useState<string | null>(null)
  const [presenceBusy, setPresenceBusy] = useState(false)
  const [memberEmail, setMemberEmail] = useState<Record<string, string>>({})
  const [addingRoomId, setAddingRoomId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const announcePresence = async (roomId: string, action: 'join' | 'leave') => {
    const res = await authFetch('/api/admin/community', {
      method: 'POST',
      body: JSON.stringify({ kind: 'staff-presence', roomId, action }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Kunne ikke skrive i rummet')
  }

  const openRoom = async (id: string) => {
    if (presenceBusy || id === chatRoomId) return
    setPresenceBusy(true)
    setError(null)
    try {
      if (chatRoomId) await announcePresence(chatRoomId, 'leave')
      await announcePresence(id, 'join')
      setChatRoomId(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fejl')
    } finally {
      setPresenceBusy(false)
    }
  }

  const leaveRoom = async () => {
    if (!chatRoomId || presenceBusy) return
    setPresenceBusy(true)
    setError(null)
    try {
      await announcePresence(chatRoomId, 'leave')
      setChatRoomId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fejl')
    } finally {
      setPresenceBusy(false)
    }
  }

  const load = useCallback(async () => {
    setError(null)
    const res = await authFetch('/api/admin/community')
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
          const day = (a.day_offset ?? 0) - (b.day_offset ?? 0)
          if (day !== 0) return day
          return (a.send_time ?? '').localeCompare(b.send_time ?? '')
        }),
    [templates, niche]
  )

  const createRoom = async () => {
    setSavingRoom(true)
    setError(null)
    try {
      const res = await authFetch('/api/admin/community', {
        method: 'POST',
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
    const res = await authFetch('/api/admin/community', {
      method: 'PATCH',
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
      const res = await authFetch('/api/admin/community', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'template',
          niche,
          trigger: draftTrigger,
          dayOffset: draftTrigger === 'day' ? Number(draftDay) : null,
          sendTime: draftTrigger === 'day' ? draftTime : null,
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

  const addMember = async (roomId: string) => {
    const email = (memberEmail[roomId] ?? '').trim()
    if (!email) return
    setAddingRoomId(roomId)
    setError(null)
    setNotice(null)
    try {
      const res = await authFetch('/api/admin/community', {
        method: 'POST',
        body: JSON.stringify({ kind: 'add-member', roomId, email }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Kunne ikke tilføje medlem')
      setMemberEmail((prev) => ({ ...prev, [roomId]: '' }))
      setNotice(`${json.displayName} er tilmeldt rummet.`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fejl')
    } finally {
      setAddingRoomId(null)
    }
  }

  const removeTemplate = async (id: string) => {
    if (!confirm('Slet denne guidance-besked?')) return
    const res = await authFetch(`/api/admin/community?templateId=${id}`, { method: 'DELETE' })
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
          Dag 0 er startdagen. Klokken er dansk tid. En besked sendes første gang tjekket kører efter det
          tidspunkt, og tjekket kører hvert kvarter. Hvis det har været nede, sendes de bagefter, så længe rummet
          er i gang. Variabler: <code>{'{{niche}}'}</code>, <code>{'{{members}}'}</code>, <code>{'{{start_date}}'}</code>.
          Allerede sendte beskeder i et rum ændres ikke.
        </p>
      </div>

      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p> : null}

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
          <p className="mt-1 text-sm text-gray-500">
            Ret teksten direkte og gem. Flere beskeder kan ligge på samme dag, med hvert sit tidspunkt.
          </p>
          <ul className="mt-4 space-y-3">
            {nicheTemplates.map((t) => (
              <TemplateCard key={t.id} template={t} onSaved={load} onDelete={removeTemplate} onError={setError} />
            ))}
          </ul>
          <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-800">Ny besked</p>
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-md border border-gray-300 px-2 py-2 text-sm"
                value={draftTrigger}
                onChange={(e) => setDraftTrigger(e.target.value as 'on_join' | 'day')}
              >
                <option value="on_join">Ved join (velkomst)</option>
                <option value="day">På en dag</option>
              </select>
              {draftTrigger === 'day' ? (
                <>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    Dag
                    <input
                      type="number"
                      min={0}
                      className="w-20 rounded-md border border-gray-300 px-2 py-2 text-sm"
                      value={draftDay}
                      onChange={(e) => setDraftDay(e.target.value)}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    Kl.
                    <input
                      type="time"
                      className="rounded-md border border-gray-300 px-2 py-2 text-sm"
                      value={draftTime}
                      onChange={(e) => setDraftTime(e.target.value)}
                    />
                  </label>
                </>
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
              Tilføj
            </button>
          </div>
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
                      <div className="flex gap-3">
                        {r.status !== 'archived' ? (
                          <button
                            type="button"
                            className="text-emerald-800 underline"
                            onClick={() => void openRoom(r.id)}
                          >
                            Skriv i rummet
                          </button>
                        ) : null}
                        {r.status !== 'archived' ? (
                          <button type="button" className="text-red-700 underline" onClick={() => void archiveRoom(r.id)}>
                            Arkivér
                          </button>
                        ) : (
                          'Afsluttet'
                        )}
                      </div>
                      {r.status !== 'archived' && r.member_count < r.capacity ? (
                        <form
                          className="mt-2 flex gap-2"
                          onSubmit={(e) => {
                            e.preventDefault()
                            void addMember(r.id)
                          }}
                        >
                          <input
                            type="email"
                            required
                            placeholder="e-mail på en konto"
                            className="w-44 rounded-md border border-gray-300 px-2 py-1 text-sm"
                            value={memberEmail[r.id] ?? ''}
                            onChange={(e) => setMemberEmail((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          />
                          <button
                            type="submit"
                            disabled={addingRoomId === r.id}
                            className="rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
                          >
                            {addingRoomId === r.id ? 'Tilføjer…' : 'Tilføj'}
                          </button>
                        </form>
                      ) : null}
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

      {chatRoomId ? (
        <RoomChat
          roomId={chatRoomId}
          title={rooms.find((r) => r.id === chatRoomId)?.title || 'Rum'}
          leaving={presenceBusy}
          onLeave={() => void leaveRoom()}
        />
      ) : null}
    </div>
  )
}

function TemplateCard({
  template,
  onSaved,
  onDelete,
  onError,
}: {
  template: CommunityTemplateRow
  onSaved: () => Promise<void>
  onDelete: (id: string) => Promise<void>
  onError: (message: string | null) => void
}) {
  const [day, setDay] = useState(String(template.day_offset ?? 0))
  const [time, setTime] = useState((template.send_time ?? '08:00').slice(0, 5))
  const [body, setBody] = useState(template.body)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    onError(null)
    try {
      const res = await authFetch('/api/admin/community', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'template',
          id: template.id,
          niche: template.niche,
          trigger: template.trigger,
          dayOffset: template.trigger === 'day' ? Number(day) : null,
          sendTime: template.trigger === 'day' ? time : null,
          body,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Kunne ikke gemme')
      await onSaved()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Fejl')
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {template.trigger === 'on_join' ? (
          <span className="font-medium text-gray-800">Velkomst, når nogen tilmelder sig</span>
        ) : (
          <span className="flex flex-wrap items-center gap-2 font-medium text-gray-800">
            Dag
            <input
              type="number"
              min={0}
              className="w-16 rounded-md border border-gray-300 bg-white px-2 py-1"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
            kl.
            <input
              type="time"
              className="rounded-md border border-gray-300 bg-white px-2 py-1"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </span>
        )}
        <button type="button" onClick={() => void onDelete(template.id)} className="text-red-600">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <textarea
        className="h-28 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="mt-2 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {saving ? 'Gemmer…' : 'Gem'}
      </button>
    </li>
  )
}

function RoomChat({
  roomId,
  title,
  leaving,
  onLeave,
}: {
  roomId: string
  title: string
  leaving: boolean
  onLeave: () => void
}) {
  const [messages, setMessages] = useState<CommunityMessageRow[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await authFetch(`/api/admin/community?roomId=${roomId}`)
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Kunne ikke hente chatten')
    setMessages(json.messages ?? [])
  }, [roomId])

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : 'Fejl'))
    const timer = setInterval(() => {
      void load().catch(() => {})
    }, 8000)
    return () => clearInterval(timer)
  }, [load])

  const refresh = async () => {
    setRefreshing(true)
    setError(null)
    try {
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fejl')
    } finally {
      setRefreshing(false)
    }
  }

  const send = async () => {
    if (!draft.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await authFetch('/api/admin/community', {
        method: 'POST',
        body: JSON.stringify({ kind: 'staff-message', roomId, body: draft }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Kunne ikke sende')
      setDraft('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fejl')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Chat · {title}</h2>
        <div className="flex gap-3">
          <button
            type="button"
            className="text-sm text-gray-700 underline disabled:opacity-60"
            onClick={() => void refresh()}
            disabled={refreshing}
          >
            {refreshing ? 'Opdaterer…' : 'Opdater'}
          </button>
          <button
            type="button"
            className="text-sm text-gray-700 underline disabled:opacity-60"
            onClick={onLeave}
            disabled={leaving}
          >
            {leaving ? 'Forlader…' : 'Forlad rum igen'}
          </button>
        </div>
      </div>
      <p className="mb-3 text-sm text-gray-500">
        Du skriver som Nicolai. Rummet kan se når du kommer ind, og når du trykker Forlad rum igen.
      </p>
      {error ? <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <div className="mb-3 max-h-80 space-y-2 overflow-y-auto rounded-lg bg-gray-50 p-3">
        {messages.length === 0 ? <p className="text-sm text-gray-500">Ingen beskeder endnu.</p> : null}
        {messages.map((m) => (
          <div key={m.id} className="rounded-md bg-white px-3 py-2 text-sm">
            <p className="font-medium text-gray-800">{m.author_name}</p>
            <p className="whitespace-pre-wrap text-gray-700">{m.body}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <textarea
          className="h-20 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Skriv til rummet"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || !draft.trim()}
          className="self-end rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {sending ? 'Sender…' : 'Send'}
        </button>
      </div>
    </section>
  )
}
