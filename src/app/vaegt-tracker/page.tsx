'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  Camera,
  ChevronDown,
  ChevronUp,
  Info,
  LineChart,
  Plus,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { createSupabaseClient } from '@/lib/supabase'
import {
  DietaryCalculator,
  ActivityLevel,
  WeightGoal,
  type UserProfile,
} from '@/lib/dietary-system'

type AdultRow = {
  id?: string
  adult_index: number
  display_name?: string | null
  gender?: string | null
  age?: number | null
  height?: number | null
  weight?: number | null
  activity_level?: number | null
  weight_goal?: string | null
  target_weight_kg?: number | null
  weight_goal_target_date?: string | null
  is_complete?: boolean | null
}

type LogEntry = {
  id: string
  weight_kg: number
  logged_at: string
  notes?: string | null
}

type PhotoRow = {
  id: string
  signedUrl: string | null
  photo_date: string | null
  created_at: string
}

const supabase = createSupabaseClient()

function mapWeightGoal(s?: string | null): WeightGoal {
  if (s === 'maintenance') return WeightGoal.Maintenance
  if (s === 'muscle-gain') return WeightGoal.MuscleGain
  return WeightGoal.WeightLoss
}

function filterByRange(entries: LogEntry[], range: '30' | '90' | '180' | 'all'): LogEntry[] {
  if (range === 'all') return entries
  const days = range === '30' ? 30 : range === '90' ? 90 : 180
  const cutoff = Date.now() - days * 86400000
  return entries.filter((e) => new Date(e.logged_at).getTime() >= cutoff)
}

function photoEffectiveMs(p: PhotoRow): number {
  if (p.photo_date && /^\d{4}-\d{2}-\d{2}$/.test(p.photo_date)) {
    return new Date(p.photo_date + 'T12:00:00').getTime()
  }
  return new Date(p.created_at).getTime()
}

function formatPhotoLabel(p: PhotoRow): string {
  if (p.photo_date && /^\d{4}-\d{2}-\d{2}$/.test(p.photo_date)) {
    return new Date(p.photo_date + 'T12:00:00').toLocaleDateString('da-DK')
  }
  return new Date(p.created_at).toLocaleDateString('da-DK')
}

function WeightChart({ entries }: { entries: LogEntry[] }) {
  const pts = useMemo(() => {
    if (entries.length < 2) return null
    const w = 560
    const h = 180
    const pad = 36
    const weights = entries.map((e) => e.weight_kg)
    const min = Math.min(...weights) - 0.5
    const max = Math.max(...weights) + 0.5
    const span = max - min || 1
    const n = entries.length
    const innerW = w - pad * 2
    const innerH = h - pad * 2
    const coords = entries.map((e, i) => {
      const x = pad + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
      const y = pad + innerH - ((e.weight_kg - min) / span) * innerH
      return { x, y, w: e.weight_kg, t: e.logged_at }
    })
    const d = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
    return { w, h, pad, d, coords, min, max }
  }, [entries])

  if (!pts) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">
        Tilføj mindst to vægtmålinger for at se udviklingen i grafen.
      </p>
    )
  }

  return (
    <svg viewBox={`0 0 ${pts.w} ${pts.h}`} className="w-full h-auto text-green-600" aria-hidden>
      <defs>
        <linearGradient id="wtFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(22 163 74 / 0.25)" />
          <stop offset="100%" stopColor="rgb(22 163 74 / 0)" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = pts.pad + (pts.h - 2 * pts.pad) * t
        return (
          <line
            key={t}
            x1={pts.pad}
            y1={y}
            x2={pts.w - pts.pad}
            y2={y}
            stroke="rgb(229 231 235)"
            strokeWidth={1}
          />
        )
      })}
      <path
        d={`${pts.d} L ${pts.coords[pts.coords.length - 1].x} ${pts.h - pts.pad} L ${pts.coords[0].x} ${pts.h - pts.pad} Z`}
        fill="url(#wtFill)"
      />
      <path d={pts.d} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
      {pts.coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r={5} className="fill-white stroke-green-600" strokeWidth={2} />
          <title>{`${c.w} kg — ${new Date(c.t).toLocaleDateString('da-DK')}`}</title>
        </g>
      ))}
      <text x={pts.pad} y={16} className="fill-gray-500 text-[11px]">
        {pts.max.toFixed(1)} kg
      </text>
      <text x={pts.pad} y={pts.h - 8} className="fill-gray-500 text-[11px]">
        {pts.min.toFixed(1)} kg
      </text>
    </svg>
  )
}

export default function VaegtTrackerPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [adultCount, setAdultCount] = useState(1)
  const [activeIndex, setActiveIndex] = useState(0)
  const [adults, setAdults] = useState<Map<number, AdultRow>>(new Map())
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [photos, setPhotos] = useState<PhotoRow[]>([])
  const [chartRange, setChartRange] = useState<'30' | '90' | '180' | 'all'>('90')
  const [infoOpen, setInfoOpen] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)

  const [logWeight, setLogWeight] = useState('')
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [logNotes, setLogNotes] = useState('')
  const [savingLog, setSavingLog] = useState(false)

  const [editName, setEditName] = useState('')
  const [editTarget, setEditTarget] = useState('')
  const [editTargetDate, setEditTargetDate] = useState('')
  const [savingPerson, setSavingPerson] = useState(false)

  const [trackerSetupError, setTrackerSetupError] = useState<string | null>(null)
  const [logActionError, setLogActionError] = useState<string | null>(null)
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null)

  const [enlargedPhoto, setEnlargedPhoto] = useState<PhotoRow | null>(null)
  const [compareLeftId, setCompareLeftId] = useState<string | null>(null)
  const [compareRightId, setCompareRightId] = useState<string | null>(null)

  const photosChrono = useMemo(() => {
    return [...photos].sort((a, b) => photoEffectiveMs(a) - photoEffectiveMs(b))
  }, [photos])

  useEffect(() => {
    const sorted = [...photos].sort((a, b) => photoEffectiveMs(a) - photoEffectiveMs(b))
    if (sorted.length < 2) {
      setCompareLeftId(null)
      setCompareRightId(null)
      return
    }
    setCompareLeftId((prev) =>
      prev && photos.some((p) => p.id === prev) ? prev : sorted[0].id
    )
    setCompareRightId((prev) =>
      prev && photos.some((p) => p.id === prev) ? prev : sorted[sorted.length - 1].id
    )
  }, [photos])

  useEffect(() => {
    if (!enlargedPhoto) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEnlargedPhoto(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enlargedPhoto])

  const authHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    return { Authorization: `Bearer ${session.access_token}` } as HeadersInit
  }, [])

  const loadFamily = useCallback(async () => {
    const h = await authHeader()
    if (!h) return
    const res = await fetch('/api/madbudget/family-profile', { headers: { ...h, 'Content-Type': 'application/json' } })
    if (!res.ok) return
    const j = await res.json()
    const fp = j.data?.familyProfile
    const aps: AdultRow[] = j.data?.adultProfiles ?? []
    const count = Math.max(1, (typeof fp?.adults === 'number' ? fp.adults : 0) || aps.length || 1)
    setAdultCount(count)
    const m = new Map<number, AdultRow>()
    for (const p of aps) {
      const idx = typeof p.adult_index === 'number' ? p.adult_index : 0
      m.set(idx, p)
    }
    setAdults(m)
  }, [authHeader])

  const refreshTrackerData = useCallback(async () => {
    const h = await authHeader()
    if (!h) return
    const [rEnt, rPho] = await Promise.all([
      fetch(`/api/weight-tracker/entries?adultIndex=${activeIndex}`, { headers: h }),
      fetch(`/api/weight-tracker/photos?adultIndex=${activeIndex}`, { headers: h }),
    ])
    const jEnt = await rEnt.json().catch(() => ({}))
    const jPho = await rPho.json().catch(() => ({}))

    const entMissing = !rEnt.ok && (rEnt.status === 503 || jEnt.code === 'PGRST205')
    const phoMissing = !rPho.ok && (rPho.status === 503 || jPho.code === 'PGRST205')
    if (entMissing || phoMissing) {
      setTrackerSetupError(
        jEnt.details ||
          jEnt.error ||
          jPho.details ||
          jPho.error ||
          'Kør add-weight-tracker-tables.sql i Supabase SQL Editor (filen ligger i projektroden).'
      )
    } else {
      setTrackerSetupError(null)
    }

    if (rEnt.ok) setEntries(jEnt.data ?? [])
    if (rPho.ok) setPhotos(jPho.data ?? [])
  }, [activeIndex, authHeader])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    let c = false
    ;(async () => {
      setLoading(true)
      await loadFamily()
      if (c) return
      setLoading(false)
    })()
    return () => {
      c = true
    }
  }, [user, loadFamily])

  useEffect(() => {
    if (!user) return
    refreshTrackerData()
  }, [user, refreshTrackerData])

  const current = adults.get(activeIndex)

  useEffect(() => {
    const a = adults.get(activeIndex)
    setEditName(a?.display_name ?? '')
    setEditTarget(a?.target_weight_kg != null ? String(a.target_weight_kg) : '')
    setEditTargetDate(a?.weight_goal_target_date ?? '')
  }, [activeIndex, adults])

  const chartEntries = useMemo(() => filterByRange(entries, chartRange), [entries, chartRange])

  const energy = useMemo(() => {
    const a = current
    if (!a?.gender || !a.age || !a.height || !a.weight || !a.activity_level) return null
    const profile: UserProfile = {
      gender: a.gender as 'male' | 'female',
      age: a.age,
      height: a.height,
      weight: Number(a.weight),
      activityLevel: a.activity_level as ActivityLevel,
      goal: mapWeightGoal(a.weight_goal),
    }
    return DietaryCalculator.calculateTargetCalories(profile)
  }, [current])

  const latest = entries.length ? entries[entries.length - 1] : null
  const baseline = chartEntries.length ? chartEntries[0] : null
  const delta =
    latest && baseline ? Math.round((latest.weight_kg - baseline.weight_kg) * 10) / 10 : null

  const savePersonMeta = async () => {
    const h = await authHeader()
    if (!h) return
    setSavingPerson(true)
    try {
      await fetch('/api/weight-tracker/person', {
        method: 'PATCH',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adultIndex: activeIndex,
          displayName: editName,
          targetWeightKg: editTarget === '' ? null : parseFloat(editTarget),
          weightGoalTargetDate: editTargetDate || null,
        }),
      })
      await loadFamily()
    } finally {
      setSavingPerson(false)
    }
  }

  const submitLog = async (e: React.FormEvent) => {
    e.preventDefault()
    const w = parseFloat(logWeight.replace(',', '.'))
    if (Number.isNaN(w)) return
    const h = await authHeader()
    if (!h) return
    setSavingLog(true)
    setLogActionError(null)
    try {
      const res = await fetch('/api/weight-tracker/entries', {
        method: 'POST',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adultIndex: activeIndex,
          weightKg: w,
          loggedAt: new Date(logDate + 'T12:00:00').toISOString(),
          notes: logNotes || null,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 503 || j.code === 'PGRST205') {
          setTrackerSetupError(j.details || j.error || null)
        } else {
          setLogActionError(j.details || j.error || 'Kunne ikke gemme måling')
        }
        return
      }
      setLogWeight('')
      setLogNotes('')
      await refreshTrackerData()
      await loadFamily()
    } finally {
      setSavingLog(false)
    }
  }

  const deleteEntry = async (id: string) => {
    if (!confirm('Slet denne måling?')) return
    const h = await authHeader()
    if (!h) return
    await fetch(`/api/weight-tracker/entries?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: h,
    })
    await refreshTrackerData()
  }

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const h = await authHeader()
    if (!h) return
    setPhotoUploadError(null)
    const fd = new FormData()
    fd.append('image', file)
    fd.append('adultIndex', String(activeIndex))
    fd.append('photoDate', logDate)
    const res = await fetch('/api/weight-tracker/photos', { method: 'POST', headers: { Authorization: (h as { Authorization: string }).Authorization }, body: fd })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (res.status === 503 || j.code === 'PGRST205') {
        setTrackerSetupError(j.details || j.error || null)
      } else {
        setPhotoUploadError(j.details || j.error || 'Upload fejlede')
      }
      return
    }
    await refreshTrackerData()
  }

  const deletePhoto = async (id: string) => {
    if (!confirm('Slet dette billede?')) return
    const h = await authHeader()
    if (!h) return
    await fetch(`/api/weight-tracker/photos?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: h })
    await refreshTrackerData()
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-8 max-w-md text-center">
          <LineChart className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Vægt tracker</h1>
          <p className="text-gray-600 text-sm mb-6">Log ind for at bruge din personlige vægt- og progress-tracker.</p>
          <Link
            href="/madbudget"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-green-600 text-white font-medium text-sm hover:bg-green-700"
          >
            Tilbage til Madbudget
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Henter data…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-green-600 mb-1">Functional Foods</p>
              <h1 className="text-3xl font-bold text-gray-900">Vægt tracker</h1>
              <p className="text-gray-600 text-sm mt-2 max-w-xl">
                Følg vægt, mål og kropsprogress — vægt siger ikke alt (væske, cyklus, træning). Kombinér tal med
                billeder og din madplan over tid.
              </p>
            </div>
            <Link href="/madbudget" className="text-sm font-medium text-gray-600 hover:text-gray-900 underline">
              ← Madbudget
            </Link>
          </div>

          <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setInfoOpen(!infoOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Info size={18} className="text-green-600" />
                Om vægt tracker
              </span>
              {infoOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {infoOpen && (
              <div className="px-4 py-3 text-sm text-gray-600 space-y-2 border-t border-gray-100 bg-white">
                <p>
                  Startdata (vægt og krop) er de samme som under Madbudget (ligevægtsindtag). Du kan give hver voksen et
                  fornavn og dit eget mål — uafhængigt af om du bruger madplanen hver uge.
                </p>
                <p>
                  Her kan du logge vægt over tid, se tendenser i grafen (ikke kun enkeltstående dage) og uploade
                  anonyme progress-fotos så du kan sammenligne kroppen visuelt.
                </p>
                <p className="text-gray-500">
                  Senere kan denne side udvides med overblik over madplan og AI-støtte — lige nu er fokus ren tracking.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        {trackerSetupError && (
          <div
            role="alert"
            className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
          >
            <p className="font-semibold">Vægt tracker: database mangler</p>
            <p className="mt-1 text-amber-900">{trackerSetupError}</p>
            <p className="mt-2 text-xs text-amber-800">
              Kør hele scriptet fra filen{' '}
              <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-amber-950">
                add-weight-tracker-tables.sql
              </code>{' '}
              i Supabase → SQL → New query → Run. Vent kort tid og genindlæs siden.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {Array.from({ length: adultCount }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                activeIndex === i
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-800 border-gray-200 hover:border-gray-300'
              }`}
            >
              <User size={16} />
              {adults.get(i)?.display_name?.trim() || `Person ${i + 1}`}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Status &amp; plan</h2>
            {latest ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Seneste måling</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {latest.weight_kg} <span className="text-lg font-semibold text-gray-500">kg</span>
                  </p>
                  <p className="text-xs text-gray-500">{new Date(latest.logged_at).toLocaleString('da-DK')}</p>
                </div>
                {delta != null && (
                  <p className={`text-sm font-medium ${delta <= 0 ? 'text-green-700' : 'text-amber-700'}`}>
                    Ændring i valgt periode: {delta > 0 ? '+' : ''}
                    {delta} kg
                  </p>
                )}
                {current?.target_weight_kg != null && (
                  <p className="text-sm text-gray-700">
                    Vægtmål: <span className="font-semibold">{current.target_weight_kg} kg</span>
                    {current.weight_goal_target_date
                      ? ` — deadline ${new Date(current.weight_goal_target_date).toLocaleDateString('da-DK')}`
                      : ''}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Ingen målinger endnu — tilføj din første vægt nedenfor.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Energi (ligevægt / vægttab)</h2>
            {energy ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-lg font-bold text-slate-800">{Math.round(energy.bmr)}</div>
                  <div className="text-[10px] text-gray-500">BMR</div>
                </div>
                <div className="rounded-lg bg-green-50 p-2">
                  <div className="text-lg font-bold text-green-800">{Math.round(energy.tdee)}</div>
                  <div className="text-[10px] text-gray-500">TDEE</div>
                </div>
                <div className="rounded-lg bg-amber-50 p-2">
                  <div className="text-lg font-bold text-amber-900">{energy.targetCalories}</div>
                  <div className="text-[10px] text-gray-500">Target kcal</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Udfyld køn, alder, højde, vægt og aktivitet under startdata (samme som Madbudget) for at se dit
                kaloriebehov.
              </p>
            )}
          </div>
        </div>

        <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 text-left"
          >
            <span className="text-sm font-semibold text-gray-900 pr-2">
              Startdata — vægt og krop
            </span>
            {profileOpen ? <ChevronUp size={18} className="shrink-0" /> : <ChevronDown size={18} className="shrink-0" />}
          </button>
          {profileOpen && (
            <ProfileInlineForm
              activeIndex={activeIndex}
              adult={current}
              onSaved={loadFamily}
              authHeader={authHeader}
            />
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Fornavn &amp; mål</h2>
            <button
              type="button"
              onClick={savePersonMeta}
              disabled={savingPerson}
              className="text-sm font-medium text-green-600 hover:text-green-700 disabled:opacity-50"
            >
              {savingPerson ? 'Gemmer…' : 'Gem'}
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500">Fornavn</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="fx dit fornavn"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Vægtmål</label>
              <input
                type="number"
                step="0.1"
                value={editTarget}
                onChange={(e) => setEditTarget(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="fx 75 kg"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Måldato (valgfri)</label>
              <input
                type="date"
                value={editTargetDate}
                onChange={(e) => setEditTargetDate(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Activity size={18} className="text-green-600" />
              Graf
            </h2>
            <div className="flex flex-wrap gap-1">
              {(['30', '90', '180', 'all'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setChartRange(r)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    chartRange === r ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {r === 'all' ? 'Alt' : `${r} d`}
                </button>
              ))}
            </div>
          </div>
          <WeightChart entries={chartEntries} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Plus size={18} className="text-green-600" />
              Log vægt
            </h2>
            <form onSubmit={submitLog} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Vægt (kg)</label>
                <input
                  required
                  value={logWeight}
                  onChange={(e) => setLogWeight(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="fx 72,4"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Dato</label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Note (valgfri)</label>
                <input
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="fx efter træning, morgen"
                />
              </div>
              <button
                type="submit"
                disabled={savingLog}
                className="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {savingLog ? 'Gemmer…' : 'Tilføj måling'}
              </button>
              {logActionError && (
                <p className="text-sm text-red-600 mt-2" role="alert">
                  {logActionError}
                </p>
              )}
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Camera size={18} className="text-green-600" />
              Progress-billeder
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Upload et billede (max 8 MB). På serveren konverteres det til komprimeret WebP (max ca. 1080 px), som ved
              opskriftsbilleder — så du bruger mindre lager uden at det ødelægger før/efter-sammenligning på skærm.
              Billederne gemmes strengt privat og vises kun for dig via midlertidige URL-links.
            </p>
            <p className="text-xs text-gray-600 mb-3">
              <strong>Tip:</strong> Tryk på et billede for at se det større. Med mindst to billeder kan du sammenligne
              tidligste og seneste nedenfor — eller vælge to bestemte fotos, hvis du har flere.
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium cursor-pointer hover:bg-gray-50">
              <Camera size={16} />
              Vælg billede
              <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
            </label>
            {photoUploadError && (
              <p className="text-sm text-red-600 mt-2" role="alert">
                {photoUploadError}
              </p>
            )}

            {photos.length >= 2 && compareLeftId && compareRightId && (() => {
              const left = photos.find((p) => p.id === compareLeftId)
              const right = photos.find((p) => p.id === compareRightId)
              if (!left || !right) return null
              const renderCompareSlot = (p: PhotoRow, side: 'Før' | 'Efter') => (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold text-gray-700">{side}</p>
                  <p className="text-[11px] text-gray-500">{formatPhotoLabel(p)}</p>
                  <button
                    type="button"
                    onClick={() => p.signedUrl && setEnlargedPhoto(p)}
                    className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100 aspect-[3/4] max-h-64 w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {p.signedUrl ? (
                      <img src={p.signedUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-xs text-gray-400 px-2">
                        Genindlæs siden
                      </span>
                    )}
                  </button>
                </div>
              )
              return (
                <div className="mt-5 rounded-xl border border-green-200 bg-green-50/60 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Sammenlign før og efter</h3>
                  {photos.length > 2 && (
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                      <label className="flex-1 text-xs text-gray-600">
                        <span className="block mb-1 font-medium text-gray-700">Før-billede</span>
                        <select
                          value={compareLeftId}
                          onChange={(e) => {
                            const id = e.target.value
                            setCompareLeftId(id)
                            if (id === compareRightId && photosChrono.length > 1) {
                              const other = photosChrono.find((p) => p.id !== id)
                              if (other) setCompareRightId(other.id)
                            }
                          }}
                          className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white"
                        >
                          {photosChrono.map((p) => (
                            <option key={p.id} value={p.id}>
                              {formatPhotoLabel(p)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex-1 text-xs text-gray-600">
                        <span className="block mb-1 font-medium text-gray-700">Efter-billede</span>
                        <select
                          value={compareRightId}
                          onChange={(e) => {
                            const id = e.target.value
                            setCompareRightId(id)
                            if (id === compareLeftId && photosChrono.length > 1) {
                              const other = photosChrono.find((p) => p.id !== id)
                              if (other) setCompareLeftId(other.id)
                            }
                          }}
                          className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white"
                        >
                          {photosChrono.map((p) => (
                            <option key={p.id} value={p.id}>
                              {formatPhotoLabel(p)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {renderCompareSlot(left, 'Før')}
                    {renderCompareSlot(right, 'Efter')}
                  </div>
                </div>
              )
            })()}

            <h3 className="text-xs font-semibold text-gray-700 mt-6 mb-2 uppercase tracking-wide">Alle billeder</h3>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((p) => (
                <div key={p.id} className="relative group rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => p.signedUrl && setEnlargedPhoto(p)}
                    className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-inset rounded-t-xl"
                    aria-label={`Vis større — ${formatPhotoLabel(p)}`}
                  >
                    {p.signedUrl ? (
                      <img
                        src={p.signedUrl}
                        alt=""
                        className="w-full h-40 object-cover cursor-zoom-in"
                      />
                    ) : (
                      <div className="h-40 flex items-center justify-center text-xs text-gray-400 px-2 text-center">
                        Kunne ikke hente visning — genindlæs siden
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      deletePhoto(p.id)
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    aria-label="Slet"
                  >
                    <Trash2 size={14} />
                  </button>
                  <p className="text-[10px] text-gray-500 px-2 py-1">
                    {formatPhotoLabel(p)} · tryk for større
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Historik</h2>
          <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {[...entries].reverse().map((e) => (
              <li key={e.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                <div>
                  <span className="font-semibold text-gray-900">{e.weight_kg} kg</span>
                  <span className="text-gray-500 ml-2">{new Date(e.logged_at).toLocaleString('da-DK')}</span>
                  {e.notes ? <p className="text-xs text-gray-500">{e.notes}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => deleteEntry(e.id)}
                  className="p-2 text-gray-400 hover:text-red-600"
                  aria-label="Slet"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
            {entries.length === 0 && <li className="py-4 text-sm text-gray-500">Ingen målinger endnu.</li>}
          </ul>
        </div>
      </div>

      {enlargedPhoto?.signedUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Stort billede"
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setEnlargedPhoto(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
            onClick={() => setEnlargedPhoto(null)}
            aria-label="Luk"
          >
            <X size={24} />
          </button>
          <div
            className="max-h-[90vh] max-w-5xl flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={enlargedPhoto.signedUrl}
              alt=""
              className="max-h-[85vh] max-w-full w-auto object-contain rounded-lg shadow-2xl"
            />
            <p className="text-sm text-white/90">{formatPhotoLabel(enlargedPhoto)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function ProfileInlineForm({
  activeIndex,
  adult,
  onSaved,
  authHeader,
}: {
  activeIndex: number
  adult?: AdultRow
  onSaved: () => Promise<void>
  authHeader: () => Promise<HeadersInit | null>
}) {
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [age, setAge] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [activity, setActivity] = useState('')
  const [wGoal, setWGoal] = useState<string>('weight-loss')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setGender((adult?.gender as 'male' | 'female') || '')
    setAge(adult?.age != null ? String(adult.age) : '')
    setHeight(adult?.height != null ? String(adult.height) : '')
    setWeight(adult?.weight != null ? String(adult.weight) : '')
    setActivity(adult?.activity_level != null ? String(adult.activity_level) : '')
    setWGoal(adult?.weight_goal || 'weight-loss')
  }, [adult])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const h = await authHeader()
    if (!h) return
    setSaving(true)
    try {
      await fetch('/api/weight-tracker/person', {
        method: 'PATCH',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adultIndex: activeIndex,
          gender: gender || null,
          age: age ? parseInt(age, 10) : null,
          height: height ? parseInt(height, 10) : null,
          weight: weight ? parseFloat(weight) : null,
          activityLevel: activity ? parseFloat(activity) : null,
          weightGoal: wGoal,
          isComplete: !!(gender && age && height && weight && activity),
        }),
      })
      await onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="px-5 py-4 space-y-4 border-t border-gray-100">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">Køn</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as 'male' | 'female' | '')}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Vælg</option>
            <option value="male">Mand</option>
            <option value="female">Kvinde</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Alder</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Højde (cm)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Vægt (kg) — seneste</label>
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500">Aktivitet</label>
        <select
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Vælg</option>
          <option value={ActivityLevel.Sedentary}>Stillesiddende</option>
          <option value={ActivityLevel.LightlyActive}>Lidt aktiv</option>
          <option value={ActivityLevel.ModeratelyActive}>Moderat aktiv</option>
          <option value={ActivityLevel.VeryActive}>Meget aktiv</option>
          <option value={ActivityLevel.ExtremelyActive}>Ekstremt aktiv</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500">Vægtmål</label>
        <select
          value={wGoal}
          onChange={(e) => setWGoal(e.target.value)}
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="weight-loss">Vægttab</option>
          <option value="maintenance">Vedligehold</option>
          <option value="muscle-gain">Muskeløgning</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
      >
        {saving ? 'Gemmer…' : 'Gem profil'}
      </button>
    </form>
  )
}
