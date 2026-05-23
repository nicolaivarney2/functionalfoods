'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle, ExternalLink, Loader2, Save, XCircle } from 'lucide-react'

type Story = {
  id: string
  userId: string
  headline: string
  displayName: string
  dietaryApproach: string
  exercised: boolean
  storyText: string
  tipsText: string | null
  weightLossKg: number
  durationWeeks: number | null
  reportedAt: string
  createdAt: string
  beforeImageUrl: string | null
  afterImageUrl: string | null
  status: 'pending' | 'approved' | 'rejected'
  moderationNote: string | null
  approvedAt: string | null
}

type Filter = 'pending' | 'approved' | 'rejected' | 'all'

const DIETARY_OPTIONS = [
  { value: 'keto', label: 'Keto' },
  { value: 'sense', label: 'Sense' },
  { value: 'glp-1', label: 'GLP-1 kost' },
  { value: 'anti-inflammatory', label: 'Anti-inflammatorisk' },
  { value: 'flexitarian', label: 'Fleksitarisk' },
  { value: '5-2-diet', label: '5:2 diæt' },
  { value: 'proteinrig-kost', label: 'Proteinrig kost' },
  { value: 'kalorietaelling', label: 'Kalorietælling' },
  { value: 'lchf-paleo', label: 'LCHF / Paleo' },
]

function prettifyDiet(value: string) {
  return DIETARY_OPTIONS.find((opt) => opt.value === value)?.label || value
}

function statusBadge(status: Story['status']) {
  if (status === 'pending') return 'bg-amber-100 text-amber-800'
  if (status === 'approved') return 'bg-emerald-100 text-emerald-800'
  return 'bg-red-100 text-red-800'
}

function statusLabel(status: Story['status']) {
  if (status === 'pending') return 'Afventer'
  if (status === 'approved') return 'Godkendt'
  return 'Afvist'
}

function StoryEditor({
  story,
  onSaved,
}: {
  story: Story
  onSaved: (id: string, status: Story['status']) => void
}) {
  const [headline, setHeadline] = useState(story.headline)
  const [displayName, setDisplayName] = useState(story.displayName)
  const [dietaryApproach, setDietaryApproach] = useState(story.dietaryApproach)
  const [exercised, setExercised] = useState(story.exercised)
  const [storyText, setStoryText] = useState(story.storyText)
  const [tipsText, setTipsText] = useState(story.tipsText || '')
  const [weightLossKg, setWeightLossKg] = useState(String(story.weightLossKg))
  const [durationWeeks, setDurationWeeks] = useState(story.durationWeeks ? String(story.durationWeeks) : '')
  const [moderationNote, setModerationNote] = useState(story.moderationNote || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setHeadline(story.headline)
    setDisplayName(story.displayName)
    setDietaryApproach(story.dietaryApproach)
    setExercised(story.exercised)
    setStoryText(story.storyText)
    setTipsText(story.tipsText || '')
    setWeightLossKg(String(story.weightLossKg))
    setDurationWeeks(story.durationWeeks ? String(story.durationWeeks) : '')
    setModerationNote(story.moderationNote || '')
  }, [story])

  async function save(overrideStatus?: Story['status']) {
    setSaving(true)
    setError(null)
    try {
      const parsedWeight = Number(weightLossKg.replace(',', '.'))
      if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
        throw new Error('Angiv gyldige tabte kilo')
      }

      const parsedWeeks = durationWeeks.trim() ? Number(durationWeeks) : null

      const res = await fetch(`/api/admin/success-stories/${story.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: headline.trim(),
          displayName: displayName.trim(),
          dietaryApproach,
          exercised,
          storyText: storyText.trim(),
          tipsText: tipsText.trim() || null,
          weightLossKg: parsedWeight,
          durationWeeks: parsedWeeks,
          moderationNote: moderationNote.trim() || null,
          status: overrideStatus,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Kunne ikke gemme')

      onSaved(story.id, json.status || overrideStatus || story.status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noget gik galt')
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(story.status)}`}>
            {statusLabel(story.status)}
          </span>
          <span className="text-xs text-gray-500">
            Indsendt {new Date(story.createdAt).toLocaleDateString('da-DK', { dateStyle: 'medium' })}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {story.status !== 'approved' && (
            <button
              type="button"
              disabled={saving}
              onClick={() => save('approved')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <CheckCircle className="h-4 w-4" />
              Godkend
            </button>
          )}
          {story.status !== 'rejected' && (
            <button
              type="button"
              disabled={saving}
              onClick={() => save('rejected')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" />
              Afvis
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => save()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Gem ændringer
          </button>
        </div>
      </div>

      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Før</p>
            {story.beforeImageUrl ? (
              <img
                src={story.beforeImageUrl}
                alt={`Før — ${story.displayName}`}
                className="aspect-[9/16] w-full rounded-lg object-cover bg-gray-100"
              />
            ) : (
              <div className="aspect-[9/16] w-full rounded-lg bg-gray-100" />
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Efter</p>
            {story.afterImageUrl ? (
              <img
                src={story.afterImageUrl}
                alt={`Efter — ${story.displayName}`}
                className="aspect-[9/16] w-full rounded-lg object-cover bg-gray-100"
              />
            ) : (
              <div className="aspect-[9/16] w-full rounded-lg bg-gray-100" />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Overskrift</label>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700">Visningsnavn</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Kostniche</label>
              <select
                value={dietaryApproach}
                onChange={(e) => setDietaryApproach(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {!DIETARY_OPTIONS.some((o) => o.value === dietaryApproach) && (
                  <option value={dietaryApproach}>{prettifyDiet(dietaryApproach)}</option>
                )}
                {DIETARY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-gray-700">Tabte kg</label>
              <input
                value={weightLossKg}
                onChange={(e) => setWeightLossKg(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Uger</label>
              <input
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(e.target.value)}
                placeholder="Valgfri"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Motion</label>
              <select
                value={exercised ? 'yes' : 'no'}
                onChange={(e) => setExercised(e.target.value === 'yes')}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="yes">Ja</option>
                <option value="no">Nej</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Historie</label>
            <textarea
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Tips</label>
            <textarea
              value={tipsText}
              onChange={(e) => setTipsText(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Moderationsnote (intern)</label>
            <input
              value={moderationNote}
              onChange={(e) => setModerationNote(e.target.value)}
              placeholder="Valgfri note til dig selv"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </article>
  )
}

export default function AdminSuccessStoriesPage() {
  const [stories, setStories] = useState<Story[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('pending')

  const loadStories = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/admin/success-stories', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Kunne ikke hente succeshistorier')
      setStories(Array.isArray(json.stories) ? json.stories : [])
      setPendingCount(typeof json.pendingCount === 'number' ? json.pendingCount : 0)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Kunne ikke hente data')
      setStories([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStories()
  }, [loadStories])

  function handleSaved(id: string, status: Story['status']) {
    setStories((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, approvedAt: status === 'approved' ? new Date().toISOString() : null } : s))
    )
    setPendingCount((prev) => {
      const story = stories.find((s) => s.id === id)
      if (!story) return prev
      if (story.status === 'pending' && status !== 'pending') return Math.max(0, prev - 1)
      if (story.status !== 'pending' && status === 'pending') return prev + 1
      return prev
    })
    window.dispatchEvent(new CustomEvent('success-stories-updated'))
  }

  const filtered =
    filter === 'all' ? stories : stories.filter((s) => s.status === filter)

  const counts = {
    pending: stories.filter((s) => s.status === 'pending').length,
    approved: stories.filter((s) => s.status === 'approved').length,
    rejected: stories.filter((s) => s.status === 'rejected').length,
    all: stories.length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Succeshistorier</h1>
          <p className="mt-2 text-gray-600">
            Godkend, rediger og afvis indsendte vægttabshistorier.
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                {pendingCount} afventer
              </span>
            )}
          </p>
        </div>
        <a
          href="/succeshistorier"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
        >
          Se offentlig side
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as Filter[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {key === 'pending' && 'Afventer'}
            {key === 'approved' && 'Godkendte'}
            {key === 'rejected' && 'Afviste'}
            {key === 'all' && 'Alle'}
            <span className="ml-1.5 opacity-80">({counts[key]})</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Indlæser...
        </div>
      )}

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
      )}

      {!loading && !loadError && filtered.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-gray-500">
          Ingen succeshistorier i denne kategori.
        </div>
      )}

      <div className="space-y-6">
        {filtered.map((story) => (
          <StoryEditor key={story.id} story={story} onSaved={handleSaved} />
        ))}
      </div>
    </div>
  )
}
