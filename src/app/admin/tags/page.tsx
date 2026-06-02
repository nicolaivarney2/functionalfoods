'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Eye,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag as TagIcon,
  Trash2,
  X,
} from 'lucide-react'

type TagField = 'mainCategory' | 'subCategories' | 'dietaryCategories'

interface TagSummary {
  name: string
  count: number
  normalised: string
}

interface SimilarTagGroup {
  field: TagField
  normalised: string
  variants: Array<{ name: string; count: number }>
}

interface TagOverviewResponse {
  recipeCount: number
  mainCategories: TagSummary[]
  subCategories: TagSummary[]
  dietaryCategories: TagSummary[]
  cleanup: {
    missingMainCategory: number
    missingSubCategories: number
    missingDietaryCategories: number
    untagged: number
    rareTags: {
      mainCategory: TagSummary[]
      subCategories: TagSummary[]
      dietaryCategories: TagSummary[]
    }
    similarTags: SimilarTagGroup[]
  }
}

interface FilteredRecipe {
  id: string
  title: string
  slug: string
  imageUrl: string | null
  mainCategory: string | null
  subCategories: string[]
  dietaryCategories: string[]
  status: string | null
  updatedAt: string | null
}

interface RecipesResponse {
  recipes: FilteredRecipe[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

interface SuggestionForRecipe {
  recipeId: string
  title: string
  mainCategory?: string | null
  subCategories?: string[]
  dietaryCategories?: string[]
  reasoning?: string
}

interface SuggestResponse {
  success: boolean
  suggestions: SuggestionForRecipe[]
  allowed: {
    mainCategory: string[]
    subCategories: string[]
    dietaryCategories: string[]
  }
}

type MissingFilter = 'mainCategory' | 'subCategories' | 'dietaryCategories' | 'untagged'

interface SenseAutoBuildSummary {
  built: number
  skipped: number
  failed: number
  details?: Array<{ recipeId: string; status: 'built' | 'skipped' | 'failed'; reason?: string }>
}

const FIELD_LABELS: Record<TagField, string> = {
  mainCategory: 'Hovedkategori',
  subCategories: 'Subkategori',
  dietaryCategories: 'Diætkategori',
}

const FIELD_PILL_STYLES: Record<TagField, string> = {
  mainCategory: 'bg-blue-100 text-blue-800 border-blue-200',
  subCategories: 'bg-purple-100 text-purple-800 border-purple-200',
  dietaryCategories: 'bg-emerald-100 text-emerald-800 border-emerald-200',
}

type Tab = 'overview' | 'filter' | 'cleanup'

function useTagOverview() {
  const [overview, setOverview] = useState<TagOverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/tags', { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      const data = (await res.json()) as TagOverviewResponse
      setOverview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukendt fejl')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { overview, loading, error, reload }
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  pillClassName,
  placeholder,
}: {
  label: string
  options: TagSummary[]
  selected: string[]
  onChange: (next: string[]) => void
  pillClassName: string
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Close the dropdown when clicking outside so multiple selects don't pile up.
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options
  }, [options, query])

  function toggle(value: string) {
    const lower = value.toLowerCase()
    if (selected.some((s) => s.toLowerCase() === lower)) {
      onChange(selected.filter((s) => s.toLowerCase() !== lower))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div className="space-y-1" ref={containerRef}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm shadow-sm hover:border-gray-400"
        >
          <span className="truncate text-gray-700">
            {selected.length === 0
              ? placeholder
              : `${selected.length} valgt`}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 text-gray-400" />
        </button>
        {open && (
          <div className="absolute z-20 mt-1 max-h-72 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
            <div className="border-b border-gray-100 p-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Søg..."
                className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-gray-400 focus:outline-none"
              />
            </div>
            <ul className="max-h-56 overflow-y-auto">
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-gray-400">Ingen tags fundet</li>
              )}
              {filtered.map((option) => {
                const isSelected = selected.some((s) => s.toLowerCase() === option.name.toLowerCase())
                return (
                  <li key={option.name}>
                    <button
                      type="button"
                      onClick={() => toggle(option.name)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 ${
                        isSelected ? 'bg-gray-50 font-medium text-gray-900' : 'text-gray-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                            isSelected ? 'border-gray-700 bg-gray-700 text-white' : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </span>
                        <span>{option.name}</span>
                      </span>
                      <span className="text-xs text-gray-400">{option.count}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {selected.map((value) => (
            <span
              key={value}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${pillClassName}`}
            >
              {value}
              <button
                type="button"
                onClick={() => onChange(selected.filter((s) => s !== value))}
                className="rounded-full hover:bg-black/10"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function TagPill({
  value,
  field,
  onRemove,
}: {
  value: string
  field: TagField
  onRemove?: () => void
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${FIELD_PILL_STYLES[field]}`}
    >
      {value}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full hover:bg-black/10"
          title={`Fjern ${value}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}

function AddTagInline({
  field,
  options,
  existing,
  onAdd,
}: {
  field: TagField
  options: TagSummary[]
  existing: string[]
  onAdd: (value: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)

  const lowerExisting = useMemo(() => new Set(existing.map((v) => v.toLowerCase())), [existing])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = options.filter((o) => !lowerExisting.has(o.name.toLowerCase()))
    return q ? base.filter((o) => o.name.toLowerCase().includes(q)) : base
  }, [options, lowerExisting, query])

  async function handleAdd(value: string) {
    if (busy) return
    setBusy(true)
    try {
      await onAdd(value)
      setOpen(false)
      setQuery('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-500 hover:border-gray-500 hover:text-gray-700"
      >
        <Plus className="h-3 w-3" />
        {FIELD_LABELS[field]}
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-64 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Søg eller skriv nyt..."
              className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-gray-400 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) {
                  e.preventDefault()
                  void handleAdd(query.trim())
                }
              }}
            />
          </div>
          <ul className="max-h-56 overflow-y-auto">
            {filtered.map((option) => (
              <li key={option.name}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleAdd(option.name)}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  <span>{option.name}</span>
                  <span className="text-xs text-gray-400">{option.count}</span>
                </button>
              </li>
            ))}
            {query.trim() &&
              !filtered.some((o) => o.name.toLowerCase() === query.trim().toLowerCase()) &&
              !lowerExisting.has(query.trim().toLowerCase()) && (
                <li>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleAdd(query.trim())}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50"
                  >
                    <Plus className="h-3 w-3" /> Tilføj ny: "{query.trim()}"
                  </button>
                </li>
              )}
            {filtered.length === 0 && !query.trim() && (
              <li className="px-3 py-2 text-xs text-gray-400">Skriv for at oprette nyt tag</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

function MainCategoryPicker({
  current,
  options,
  onChange,
}: {
  current: string | null
  options: TagSummary[]
  onChange: (value: string | null) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options
  }, [options, query])

  async function handle(value: string | null) {
    if (busy) return
    setBusy(true)
    try {
      await onChange(value)
      setOpen(false)
      setQuery('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative inline-block">
      {current ? (
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${FIELD_PILL_STYLES.mainCategory}`}
        >
          <button type="button" onClick={() => setOpen((o) => !o)}>
            {current}
          </button>
          <button
            type="button"
            onClick={() => void handle(null)}
            className="rounded-full hover:bg-black/10"
            title="Fjern hovedkategori"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-500 hover:border-gray-500 hover:text-gray-700"
        >
          <Plus className="h-3 w-3" /> Hovedkategori
        </button>
      )}
      {open && (
        <div className="absolute z-30 mt-1 w-64 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Søg eller skriv nyt..."
              className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-gray-400 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) {
                  e.preventDefault()
                  void handle(query.trim())
                }
              }}
            />
          </div>
          <ul className="max-h-56 overflow-y-auto">
            {filtered.map((option) => (
              <li key={option.name}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handle(option.name)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-sm hover:bg-gray-50 ${
                    current?.toLowerCase() === option.name.toLowerCase()
                      ? 'bg-gray-50 font-medium'
                      : ''
                  }`}
                >
                  <span>{option.name}</span>
                  <span className="text-xs text-gray-400">{option.count}</span>
                </button>
              </li>
            ))}
            {query.trim() &&
              !filtered.some((o) => o.name.toLowerCase() === query.trim().toLowerCase()) && (
                <li>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handle(query.trim())}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50"
                  >
                    <Plus className="h-3 w-3" /> Brug ny: "{query.trim()}"
                  </button>
                </li>
              )}
          </ul>
        </div>
      )}
    </div>
  )
}

function OverviewTab({
  overview,
  onRenameRequest,
}: {
  overview: TagOverviewResponse
  onRenameRequest: (field: TagField, fromValue: string) => void
}) {
  function TagTable({ title, field, tags }: { title: string; field: TagField; tags: TagSummary[] }) {
    if (tags.length === 0) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
          <p className="mt-2 text-sm text-gray-500">Ingen tags fundet.</p>
        </div>
      )
    }
    return (
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-700">
            {title} <span className="text-gray-400">({tags.length})</span>
          </h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <ul className="divide-y divide-gray-100">
            {tags.map((tag) => (
              <li key={tag.name} className="flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50">
                <span className="flex items-center gap-2">
                  <TagPill value={tag.name} field={field} />
                  <span className="text-xs text-gray-400">{tag.count} opskrifter</span>
                </span>
                <button
                  type="button"
                  onClick={() => onRenameRequest(field, tag.name)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Omdøb / flet
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Opskrifter i alt" value={overview.recipeCount} />
        <StatCard
          label="Mangler diætkategori"
          value={overview.cleanup.missingDietaryCategories}
          tone={overview.cleanup.missingDietaryCategories > 0 ? 'warning' : 'neutral'}
        />
        <StatCard
          label="Mangler hovedkategori"
          value={overview.cleanup.missingMainCategory}
          tone={overview.cleanup.missingMainCategory > 0 ? 'warning' : 'neutral'}
        />
        <StatCard
          label="Helt utaggede"
          value={overview.cleanup.untagged}
          tone={overview.cleanup.untagged > 0 ? 'danger' : 'neutral'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TagTable title="Diætkategorier" field="dietaryCategories" tags={overview.dietaryCategories} />
        <TagTable title="Hovedkategorier" field="mainCategory" tags={overview.mainCategories} />
        <TagTable title="Subkategorier" field="subCategories" tags={overview.subCategories} />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number
  tone?: 'neutral' | 'warning' | 'danger'
}) {
  const toneClasses =
    tone === 'danger'
      ? 'border-red-200 bg-red-50'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50'
        : 'border-gray-200 bg-white'
  return (
    <div className={`rounded-lg border p-4 ${toneClasses}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  )
}

function CleanupTab({
  overview,
  onLoadFilteredView,
  onRenameRequest,
}: {
  overview: TagOverviewResponse
  onLoadFilteredView: (params: {
    missing?: MissingFilter[]
    dietaryCategories?: string[]
    subCategories?: string[]
    mainCategories?: string[]
    maxDietaryCount?: number | null
  }) => void
  onRenameRequest: (field: TagField, fromValue: string) => void
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 text-amber-800">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="text-sm font-semibold">Under-taggede opskrifter</h3>
        </div>
        <p className="mt-1 text-sm text-amber-700">
          Klik for at åbne dem i filterfanen og rette dem i bulk. AI kan ofte foreslå manglende tags.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onLoadFilteredView({ missing: ['dietaryCategories'] })}
            className="rounded border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100"
          >
            Mangler diætkategori ({overview.cleanup.missingDietaryCategories})
          </button>
          <button
            type="button"
            onClick={() => onLoadFilteredView({ maxDietaryCount: 1 })}
            className="rounded border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100"
            title="Mange opskrifter har kun Keto, men burde også have fx GLP-1 eller Sense"
          >
            Max 1 diætkategori
          </button>
          <button
            type="button"
            onClick={() => onLoadFilteredView({ maxDietaryCount: 2 })}
            className="rounded border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100"
          >
            Max 2 diætkategorier
          </button>
          <button
            type="button"
            onClick={() => onLoadFilteredView({ missing: ['mainCategory'] })}
            className="rounded border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100"
          >
            Mangler hovedkategori ({overview.cleanup.missingMainCategory})
          </button>
          <button
            type="button"
            onClick={() => onLoadFilteredView({ missing: ['subCategories'] })}
            className="rounded border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100"
          >
            Mangler subkategori ({overview.cleanup.missingSubCategories})
          </button>
          <button
            type="button"
            onClick={() => onLoadFilteredView({ missing: ['untagged'] })}
            className="rounded border border-red-300 bg-white px-3 py-1.5 text-sm text-red-800 hover:bg-red-100"
          >
            Helt utaggede ({overview.cleanup.untagged})
          </button>
        </div>
      </div>

      {overview.cleanup.similarTags.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Mulige duplikater (samme tag, forskellige stavemåder)
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Vælg den korrekte stavemåde, og flet de andre ind.
            </p>
          </div>
          <ul className="divide-y divide-gray-100">
            {overview.cleanup.similarTags.map((group, idx) => (
              <li key={`${group.field}:${group.normalised}:${idx}`} className="px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {FIELD_LABELS[group.field]}
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {group.variants.map((v) => (
                    <div
                      key={v.name}
                      className="flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-1"
                    >
                      <TagPill value={v.name} field={group.field} />
                      <span className="text-xs text-gray-400">{v.count}</span>
                      <button
                        type="button"
                        onClick={() => onRenameRequest(group.field, v.name)}
                        className="ml-1 text-xs text-blue-600 hover:underline"
                      >
                        Flet
                      </button>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RareTagsCard
          title="Sjældne diætkategorier"
          field="dietaryCategories"
          tags={overview.cleanup.rareTags.dietaryCategories}
          onRenameRequest={onRenameRequest}
          onView={(name) => onLoadFilteredView({ dietaryCategories: [name] })}
        />
        <RareTagsCard
          title="Sjældne hovedkategorier"
          field="mainCategory"
          tags={overview.cleanup.rareTags.mainCategory}
          onRenameRequest={onRenameRequest}
          onView={(name) => onLoadFilteredView({ mainCategories: [name] })}
        />
        <RareTagsCard
          title="Sjældne subkategorier"
          field="subCategories"
          tags={overview.cleanup.rareTags.subCategories}
          onRenameRequest={onRenameRequest}
          onView={(name) => onLoadFilteredView({ subCategories: [name] })}
        />
      </div>
    </div>
  )
}

function RareTagsCard({
  title,
  field,
  tags,
  onRenameRequest,
  onView,
}: {
  title: string
  field: TagField
  tags: TagSummary[]
  onRenameRequest: (field: TagField, from: string) => void
  onView: (name: string) => void
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-700">
          {title} <span className="text-gray-400">(≤2 opskrifter)</span>
        </h3>
      </div>
      {tags.length === 0 ? (
        <p className="px-4 py-3 text-sm text-gray-400">Ingen sjældne tags.</p>
      ) : (
        <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto">
          {tags.map((tag) => (
            <li key={tag.name} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="flex items-center gap-2">
                <TagPill value={tag.name} field={field} />
                <span className="text-xs text-gray-400">{tag.count}</span>
              </span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onView(tag.name)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Vis
                </button>
                <button
                  type="button"
                  onClick={() => onRenameRequest(field, tag.name)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Omdøb
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface RenameModalState {
  field: TagField
  from: string
}

function RenameModal({
  state,
  overview,
  onClose,
  onComplete,
}: {
  state: RenameModalState
  overview: TagOverviewResponse
  onClose: () => void
  onComplete: () => void
}) {
  const [to, setTo] = useState(state.from)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const suggestions =
    state.field === 'mainCategory'
      ? overview.mainCategories
      : state.field === 'subCategories'
        ? overview.subCategories
        : overview.dietaryCategories

  async function handleSubmit(removeWithoutReplacement: boolean) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/tags/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: state.field,
          from: state.from,
          to: removeWithoutReplacement ? null : to.trim() || null,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukendt fejl')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="border-b border-gray-100 px-5 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Omdøb / flet tag</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {FIELD_LABELS[state.field]} – fra "{state.from}" på tværs af alle opskrifter.
          </p>
        </div>
        <div className="space-y-3 px-5 py-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
            Nyt navn (eller behold eksisterende stavemåde)
          </label>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            placeholder="Fx Keto"
          />
          <div>
            <div className="text-xs text-gray-500">Eksisterende stavemåder:</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {suggestions
                .filter((s) => s.name.toLowerCase() !== state.from.toLowerCase())
                .slice(0, 12)
                .map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => setTo(s.name)}
                    className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs hover:bg-gray-100"
                  >
                    {s.name}
                  </button>
                ))}
            </div>
          </div>
          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => handleSubmit(true)}
            className="text-sm text-red-600 hover:underline"
          >
            <Trash2 className="mr-1 inline h-4 w-4" /> Fjern uden at erstatte
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Annullér
            </button>
            <button
              type="button"
              disabled={busy || !to.trim()}
              onClick={() => handleSubmit(false)}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {busy ? (
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              ) : null}
              Omdøb {to.trim() && to.trim().toLowerCase() !== state.from.toLowerCase() ? `→ ${to.trim()}` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterTab({
  overview,
  initialFilters,
  onReloadOverview,
}: {
  overview: TagOverviewResponse
  initialFilters: FilterState
  onReloadOverview: () => void
}) {
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [recipes, setRecipes] = useState<FilteredRecipe[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busyRowIds, setBusyRowIds] = useState<Set<string>>(new Set())
  const [suggestions, setSuggestions] = useState<Map<string, SuggestionForRecipe>>(new Map())
  const [aiBusy, setAiBusy] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [searchDraft, setSearchDraft] = useState(initialFilters.search)
  const [senseNotice, setSenseNotice] = useState<SenseAutoBuildSummary | null>(null)

  useEffect(() => {
    setFilters(initialFilters)
    setSearchDraft(initialFilters.search)
  }, [initialFilters])

  const abortRef = useRef<AbortController | null>(null)

  const reloadRecipes = useCallback(async () => {
    // Cancel any in-flight request so rapid filter clicks don't race and
    // leave the page in an inconsistent state.
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters.mainCategories.length) params.set('mainCategory', filters.mainCategories.join(','))
      if (filters.subCategories.length) params.set('subCategories', filters.subCategories.join(','))
      if (filters.dietaryCategories.length)
        params.set('dietaryCategories', filters.dietaryCategories.join(','))
      if (filters.missing.length) params.set('missing', filters.missing.join(','))
      if (filters.search.trim()) params.set('search', filters.search.trim())
      if (filters.maxDietaryCount !== null) {
        params.set('maxDietaryCount', String(filters.maxDietaryCount))
      }
      params.set('limit', '50')

      const res = await fetch(`/api/admin/tags/recipes?${params.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const baseError = body?.error || `HTTP ${res.status}`
        const details = body?.details ? ` (${body.details})` : ''
        throw new Error(`${baseError}${details}`)
      }
      const data = (await res.json()) as RecipesResponse
      if (controller.signal.aborted) return
      setRecipes(data.recipes)
      setTotal(data.total)
      setSelected(new Set())
      setSuggestions(new Map())
    } catch (err) {
      // Aborted requests aren't real errors – ignore them.
      if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        return
      }
      setError(err instanceof Error ? err.message : 'Ukendt fejl')
    } finally {
      if (abortRef.current === controller) {
        setLoading(false)
      }
    }
  }, [filters])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    void reloadRecipes()
  }, [reloadRecipes])

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === recipes.length ? new Set() : new Set(recipes.map((r) => r.id)),
    )
  }

  async function applyBulk(field: TagField, operation: 'add' | 'remove' | 'set' | 'clear', values: string[] | string | null) {
    if (selected.size === 0) return
    const recipeIds = Array.from(selected)
    setLoading(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        recipeIds,
        field,
        operation,
      }
      if (field === 'mainCategory') {
        payload.value = typeof values === 'string' ? values : null
      } else {
        payload.values = Array.isArray(values) ? values : values ? [values] : []
      }
      const res = await fetch('/api/admin/tags/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
      if (body?.senseAutoBuild) {
        setSenseNotice(body.senseAutoBuild as SenseAutoBuildSummary)
      }
      await reloadRecipes()
      onReloadOverview()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukendt fejl')
    } finally {
      setLoading(false)
    }
  }

  async function updateRecipeTag(
    recipe: FilteredRecipe,
    field: TagField,
    operation: 'add' | 'remove' | 'set',
    value: string | null,
  ) {
    setBusyRowIds((prev) => new Set(prev).add(recipe.id))
    try {
      const payload: Record<string, unknown> = {
        recipeIds: [recipe.id],
        field,
        operation,
      }
      if (field === 'mainCategory') {
        payload.value = value
      } else {
        payload.values = value ? [value] : []
      }
      const res = await fetch('/api/admin/tags/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
      if (body?.senseAutoBuild) {
        setSenseNotice(body.senseAutoBuild as SenseAutoBuildSummary)
      }
      setRecipes((prev) =>
        prev.map((r) => {
          if (r.id !== recipe.id) return r
          const next = { ...r }
          if (field === 'mainCategory') {
            next.mainCategory = operation === 'add' || operation === 'set' ? value : null
          } else {
            const current = field === 'subCategories' ? r.subCategories : r.dietaryCategories
            let newList = current
            if (operation === 'add' && value) {
              newList = current.some((v) => v.toLowerCase() === value.toLowerCase())
                ? current
                : [...current, value]
            } else if (operation === 'remove' && value) {
              newList = current.filter((v) => v.toLowerCase() !== value.toLowerCase())
            } else if (operation === 'set') {
              newList = value ? [value] : []
            }
            if (field === 'subCategories') next.subCategories = newList
            else next.dietaryCategories = newList
          }
          return next
        }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukendt fejl')
    } finally {
      setBusyRowIds((prev) => {
        const next = new Set(prev)
        next.delete(recipe.id)
        return next
      })
    }
  }

  async function fetchAiSuggestions(recipeIds: string[]) {
    if (recipeIds.length === 0) return
    setAiBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/tags/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeIds }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
      const data = body as SuggestResponse
      setSuggestions((prev) => {
        const next = new Map(prev)
        for (const s of data.suggestions) {
          next.set(s.recipeId, s)
        }
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukendt fejl')
    } finally {
      setAiBusy(false)
    }
  }

  function updateSuggestion(
    recipeId: string,
    updater: (current: SuggestionForRecipe) => SuggestionForRecipe,
  ) {
    setSuggestions((prev) => {
      const current = prev.get(recipeId)
      if (!current) return prev
      const next = new Map(prev)
      next.set(recipeId, updater(current))
      return next
    })
  }

  function addToSuggestion(
    recipeId: string,
    field: 'subCategories' | 'dietaryCategories',
    value: string,
  ) {
    updateSuggestion(recipeId, (current) => {
      const existing = current[field] ?? []
      if (existing.some((v) => v.toLowerCase() === value.toLowerCase())) return current
      return { ...current, [field]: [...existing, value] }
    })
  }

  function removeFromSuggestion(
    recipeId: string,
    field: 'subCategories' | 'dietaryCategories',
    value: string,
  ) {
    updateSuggestion(recipeId, (current) => {
      const existing = current[field] ?? []
      return { ...current, [field]: existing.filter((v) => v.toLowerCase() !== value.toLowerCase()) }
    })
  }

  function setSuggestionMain(recipeId: string, value: string | null) {
    updateSuggestion(recipeId, (current) => ({ ...current, mainCategory: value }))
  }

  async function applySuggestion(recipe: FilteredRecipe, suggestion: SuggestionForRecipe) {
    setBusyRowIds((prev) => new Set(prev).add(recipe.id))
    try {
      const tasks: Array<Promise<Response>> = []
      // Only touch mainCategory if there's an actual value to set, so we don't
      // accidentally wipe an existing main category when the AI couldn't suggest one.
      if (
        typeof suggestion.mainCategory === 'string' &&
        suggestion.mainCategory.trim().length > 0 &&
        suggestion.mainCategory.toLowerCase() !== (recipe.mainCategory ?? '').toLowerCase()
      ) {
        tasks.push(
          fetch('/api/admin/tags/bulk-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipeIds: [recipe.id],
              field: 'mainCategory',
              operation: 'set',
              value: suggestion.mainCategory,
            }),
          }),
        )
      }
      if (suggestion.subCategories) {
        const toAdd = suggestion.subCategories.filter(
          (v) => !recipe.subCategories.some((c) => c.toLowerCase() === v.toLowerCase()),
        )
        if (toAdd.length > 0) {
          tasks.push(
            fetch('/api/admin/tags/bulk-update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipeIds: [recipe.id],
                field: 'subCategories',
                operation: 'add',
                values: toAdd,
              }),
            }),
          )
        }
      }
      if (suggestion.dietaryCategories) {
        const toAdd = suggestion.dietaryCategories.filter(
          (v) => !recipe.dietaryCategories.some((c) => c.toLowerCase() === v.toLowerCase()),
        )
        if (toAdd.length > 0) {
          tasks.push(
            fetch('/api/admin/tags/bulk-update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipeIds: [recipe.id],
                field: 'dietaryCategories',
                operation: 'add',
                values: toAdd,
              }),
            }),
          )
        }
      }
      const responses = await Promise.all(tasks)
      const senseSummaries: SenseAutoBuildSummary[] = []
      for (const r of responses) {
        try {
          const body = await r.clone().json()
          if (body?.senseAutoBuild) senseSummaries.push(body.senseAutoBuild as SenseAutoBuildSummary)
        } catch {
          /* ignore */
        }
      }
      if (senseSummaries.length > 0) {
        const merged: SenseAutoBuildSummary = senseSummaries.reduce(
          (acc, s) => ({
            built: acc.built + s.built,
            skipped: acc.skipped + s.skipped,
            failed: acc.failed + s.failed,
          }),
          { built: 0, skipped: 0, failed: 0 },
        )
        setSenseNotice(merged)
      }
      setSuggestions((prev) => {
        const next = new Map(prev)
        next.delete(recipe.id)
        return next
      })
      await reloadRecipes()
      onReloadOverview()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukendt fejl')
    } finally {
      setBusyRowIds((prev) => {
        const next = new Set(prev)
        next.delete(recipe.id)
        return next
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter className="h-4 w-4" />
          Filtrer opskrifter
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <MultiSelect
            label="Diætkategori"
            options={overview.dietaryCategories}
            selected={filters.dietaryCategories}
            onChange={(next) => setFilters((f) => ({ ...f, dietaryCategories: next }))}
            pillClassName={FIELD_PILL_STYLES.dietaryCategories}
            placeholder="Alle diætkategorier"
          />
          <MultiSelect
            label="Hovedkategori"
            options={overview.mainCategories}
            selected={filters.mainCategories}
            onChange={(next) => setFilters((f) => ({ ...f, mainCategories: next }))}
            pillClassName={FIELD_PILL_STYLES.mainCategory}
            placeholder="Alle hovedkategorier"
          />
          <MultiSelect
            label="Subkategori"
            options={overview.subCategories}
            selected={filters.subCategories}
            onChange={(next) => setFilters((f) => ({ ...f, subCategories: next }))}
            pillClassName={FIELD_PILL_STYLES.subCategories}
            placeholder="Alle subkategorier"
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
              Mangler / under-tagget
            </label>
            <div className="mt-1 flex flex-wrap gap-1">
              {(
                [
                  { key: 'dietaryCategories', label: 'Mangler diæt' },
                  { key: 'mainCategory', label: 'Mangler hovedkat' },
                  { key: 'subCategories', label: 'Mangler subkat' },
                  { key: 'untagged', label: 'Helt utagget' },
                ] as Array<{ key: MissingFilter; label: string }>
              ).map(({ key, label }) => {
                const active = filters.missing.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        missing: active ? f.missing.filter((m) => m !== key) : [...f.missing, key],
                      }))
                    }
                    className={`rounded-full border px-2 py-0.5 text-xs ${
                      active
                        ? 'border-red-300 bg-red-100 text-red-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
              {(
                [
                  { value: 1, label: 'Max 1 diæt' },
                  { value: 2, label: 'Max 2 diæt' },
                ] as Array<{ value: number; label: string }>
              ).map(({ value, label }) => {
                const active = filters.maxDietaryCount === value
                return (
                  <button
                    key={`max-${value}`}
                    type="button"
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        maxDietaryCount: active ? null : value,
                      }))
                    }
                    className={`rounded-full border px-2 py-0.5 text-xs ${
                      active
                        ? 'border-amber-400 bg-amber-100 text-amber-900'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                    }`}
                    title={`Vis opskrifter med ${value} eller færre diætkategorier`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
              Søg i titel
            </label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setFilters((f) => ({ ...f, search: searchDraft }))
                  }
                }}
                className="w-full rounded border border-gray-300 pl-8 pr-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                placeholder="Tryk Enter for at søge"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFilters((f) => ({ ...f, search: searchDraft }))}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Anvend søgning
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters({
                dietaryCategories: [],
                mainCategories: [],
                subCategories: [],
                missing: [],
                search: '',
                maxDietaryCount: null,
              })
              setSearchDraft('')
            }}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Nulstil filtre
          </button>
          <button
            type="button"
            onClick={() => reloadRecipes()}
            disabled={loading}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`mr-1 inline h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Genindlæs
          </button>
        </div>
      </div>

      {selected.size > 0 && (
        <BulkActionBar
          overview={overview}
          selectedCount={selected.size}
          open={bulkOpen}
          setOpen={setBulkOpen}
          onClearSelection={() => setSelected(new Set())}
          onApply={applyBulk}
          onAiSuggest={() => fetchAiSuggestions(Array.from(selected))}
          aiBusy={aiBusy}
        />
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {senseNotice && (
        <div className="flex items-start justify-between gap-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <div>
            <div className="font-semibold">Sense spisekasse auto-byg</div>
            <div className="text-emerald-700">
              Byggede grupper for <strong>{senseNotice.built}</strong> opskrift
              {senseNotice.built === 1 ? '' : 'er'},{' '}
              <strong>{senseNotice.skipped}</strong> sprunget over,{' '}
              <strong>{senseNotice.failed}</strong> fejlede
              {senseNotice.failed > 0 ? ' (ingredienser kunne ikke klassificeres)' : ''}.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSenseNotice(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="text-sm text-gray-600">
            Viser <span className="font-semibold text-gray-900">{recipes.length}</span> af{' '}
            <span className="font-semibold text-gray-900">{total}</span> opskrifter
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={selected.size > 0 && selected.size === recipes.length}
                onChange={toggleAll}
              />
              Vælg alle (på siden)
            </label>
          </div>
        </div>

        {loading && recipes.length === 0 ? (
          <div className="flex items-center justify-center px-4 py-10 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Henter opskrifter...
          </div>
        ) : recipes.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-500">
            Ingen opskrifter matcher de valgte filtre.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recipes.map((recipe) => {
              const isSelected = selected.has(recipe.id)
              const rowBusy = busyRowIds.has(recipe.id)
              const suggestion = suggestions.get(recipe.id)
              return (
                <li key={recipe.id} className={`px-4 py-3 ${isSelected ? 'bg-blue-50/40' : ''}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(recipe.id)}
                      className="mt-1.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <a
                              href={`/opskrift/${recipe.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-medium text-gray-900 hover:underline"
                            >
                              {recipe.title}
                            </a>
                            <a
                              href={`/opskrift/${recipe.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-gray-400 hover:text-gray-600"
                              title="Åbn opskrift"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </a>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <MainCategoryPicker
                              current={recipe.mainCategory}
                              options={overview.mainCategories}
                              onChange={(value) =>
                                updateRecipeTag(recipe, 'mainCategory', 'set', value)
                              }
                            />
                            {recipe.subCategories.map((value) => (
                              <TagPill
                                key={`sub-${value}`}
                                value={value}
                                field="subCategories"
                                onRemove={() =>
                                  updateRecipeTag(recipe, 'subCategories', 'remove', value)
                                }
                              />
                            ))}
                            <AddTagInline
                              field="subCategories"
                              options={overview.subCategories}
                              existing={recipe.subCategories}
                              onAdd={(value) =>
                                updateRecipeTag(recipe, 'subCategories', 'add', value)
                              }
                            />
                            {recipe.dietaryCategories.map((value) => (
                              <TagPill
                                key={`diet-${value}`}
                                value={value}
                                field="dietaryCategories"
                                onRemove={() =>
                                  updateRecipeTag(recipe, 'dietaryCategories', 'remove', value)
                                }
                              />
                            ))}
                            <AddTagInline
                              field="dietaryCategories"
                              options={overview.dietaryCategories}
                              existing={recipe.dietaryCategories}
                              onAdd={(value) =>
                                updateRecipeTag(recipe, 'dietaryCategories', 'add', value)
                              }
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {rowBusy && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                          <button
                            type="button"
                            disabled={aiBusy}
                            onClick={() => fetchAiSuggestions([recipe.id])}
                            className="inline-flex items-center gap-1 rounded border border-purple-200 bg-purple-50 px-2 py-1 text-xs text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                            title="Bed AI om at foreslå tags"
                          >
                            <Sparkles className="h-3 w-3" /> AI foreslå
                          </button>
                        </div>
                      </div>

                      {suggestion && (
                        <div className="mt-3 rounded border border-purple-200 bg-purple-50/60 p-3">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold text-purple-800">
                              AI forslag <span className="font-normal text-purple-600">(redigér før du anvender)</span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setSuggestions((prev) => {
                                  const next = new Map(prev)
                                  next.delete(recipe.id)
                                  return next
                                })
                              }
                              className="text-purple-700 hover:text-purple-900"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
                            {suggestion.mainCategory !== undefined && (
                              <MainCategoryPicker
                                current={suggestion.mainCategory ?? null}
                                options={overview.mainCategories}
                                onChange={async (value) => {
                                  setSuggestionMain(recipe.id, value)
                                }}
                              />
                            )}
                            {(suggestion.subCategories ?? []).map((v) => (
                              <TagPill
                                key={`sug-sub-${v}`}
                                value={v}
                                field="subCategories"
                                onRemove={() => removeFromSuggestion(recipe.id, 'subCategories', v)}
                              />
                            ))}
                            <AddTagInline
                              field="subCategories"
                              options={overview.subCategories}
                              existing={suggestion.subCategories ?? []}
                              onAdd={async (value) => {
                                addToSuggestion(recipe.id, 'subCategories', value)
                              }}
                            />
                            {(suggestion.dietaryCategories ?? []).map((v) => (
                              <TagPill
                                key={`sug-diet-${v}`}
                                value={v}
                                field="dietaryCategories"
                                onRemove={() =>
                                  removeFromSuggestion(recipe.id, 'dietaryCategories', v)
                                }
                              />
                            ))}
                            <AddTagInline
                              field="dietaryCategories"
                              options={overview.dietaryCategories}
                              existing={suggestion.dietaryCategories ?? []}
                              onAdd={async (value) => {
                                addToSuggestion(recipe.id, 'dietaryCategories', value)
                              }}
                            />
                          </div>
                          {suggestion.reasoning && (
                            <p className="mt-2 text-xs italic text-purple-700">
                              {suggestion.reasoning}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              disabled={rowBusy}
                              onClick={() => applySuggestion(recipe, suggestion)}
                              className="inline-flex items-center gap-1 rounded bg-purple-600 px-2 py-1 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                            >
                              <Check className="h-3 w-3" /> Anvend forslag
                            </button>
                            <span className="text-xs text-purple-700">
                              Tilføj/fjern tags ovenfor – kun det du ser bliver gemt.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

interface FilterState {
  mainCategories: string[]
  subCategories: string[]
  dietaryCategories: string[]
  missing: MissingFilter[]
  search: string
  // null = no limit. 1 = "max 1 diætkategori", 2 = "max 2 diætkategorier".
  maxDietaryCount: number | null
}

function BulkActionBar({
  overview,
  selectedCount,
  open,
  setOpen,
  onClearSelection,
  onApply,
  onAiSuggest,
  aiBusy,
}: {
  overview: TagOverviewResponse
  selectedCount: number
  open: boolean
  setOpen: (open: boolean) => void
  onClearSelection: () => void
  onApply: (
    field: TagField,
    operation: 'add' | 'remove' | 'set' | 'clear',
    values: string[] | string | null,
  ) => void | Promise<void>
  onAiSuggest: () => void
  aiBusy: boolean
}) {
  const [pendingField, setPendingField] = useState<TagField>('dietaryCategories')
  const [pendingOperation, setPendingOperation] = useState<'add' | 'remove' | 'set'>('add')
  const [pendingValue, setPendingValue] = useState<string>('')

  const options =
    pendingField === 'mainCategory'
      ? overview.mainCategories
      : pendingField === 'subCategories'
        ? overview.subCategories
        : overview.dietaryCategories

  function handleApply() {
    if (!pendingValue.trim()) return
    if (pendingField === 'mainCategory') {
      void onApply('mainCategory', 'set', pendingValue.trim())
    } else {
      void onApply(pendingField, pendingOperation, [pendingValue.trim()])
    }
    setPendingValue('')
  }

  return (
    <div className="sticky top-16 z-30 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-medium text-blue-900">
          {selectedCount} opskrift{selectedCount === 1 ? '' : 'er'} valgt
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={aiBusy}
            onClick={onAiSuggest}
            className="inline-flex items-center gap-1 rounded bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            AI foreslå tags for valgte
          </button>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="rounded border border-blue-300 bg-white px-3 py-1.5 text-sm text-blue-800 hover:bg-blue-100"
          >
            Bulk-redigér tags
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Ryd valg
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-3 rounded border border-blue-200 bg-white p-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600">Felt</label>
              <select
                value={pendingField}
                onChange={(e) => setPendingField(e.target.value as TagField)}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="dietaryCategories">Diætkategori</option>
                <option value="mainCategory">Hovedkategori</option>
                <option value="subCategories">Subkategori</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600">Handling</label>
              <select
                value={pendingOperation}
                onChange={(e) =>
                  setPendingOperation(e.target.value as 'add' | 'remove' | 'set')
                }
                disabled={pendingField === 'mainCategory'}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-50"
              >
                <option value="add">Tilføj tag</option>
                <option value="remove">Fjern tag</option>
                <option value="set">Erstat alle med</option>
              </select>
              {pendingField === 'mainCategory' && (
                <p className="mt-1 text-xs text-gray-500">Hovedkategori kan kun sættes/clears.</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-gray-600">Værdi</label>
              <input
                list="bulk-tag-options"
                value={pendingValue}
                onChange={(e) => setPendingValue(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                placeholder="Skriv eller vælg tag..."
              />
              <datalist id="bulk-tag-options">
                {options.map((opt) => (
                  <option key={opt.name} value={opt.name} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            {pendingField !== 'mainCategory' && (
              <button
                type="button"
                onClick={() => void onApply(pendingField, 'clear', [])}
                className="text-xs text-red-600 hover:underline"
              >
                <Trash2 className="mr-1 inline h-3 w-3" />
                Ryd alle tags i feltet for valgte
              </button>
            )}
            {pendingField === 'mainCategory' && (
              <button
                type="button"
                onClick={() => void onApply('mainCategory', 'clear', null)}
                className="text-xs text-red-600 hover:underline"
              >
                <Trash2 className="mr-1 inline h-3 w-3" />
                Fjern hovedkategori for valgte
              </button>
            )}
            <button
              type="button"
              onClick={handleApply}
              disabled={!pendingValue.trim()}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              Anvend på {selectedCount} opskrift{selectedCount === 1 ? '' : 'er'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminTagsPage() {
  const { overview, loading, error, reload } = useTagOverview()
  const [tab, setTab] = useState<Tab>('overview')
  const [renameState, setRenameState] = useState<RenameModalState | null>(null)
  const [filterInit, setFilterInit] = useState<FilterState>({
    mainCategories: [],
    subCategories: [],
    dietaryCategories: [],
    missing: [],
    search: '',
    maxDietaryCount: null,
  })

  function openRename(field: TagField, fromValue: string) {
    setRenameState({ field, from: fromValue })
  }

  function openFilteredView(params: {
    missing?: MissingFilter[]
    dietaryCategories?: string[]
    subCategories?: string[]
    mainCategories?: string[]
    maxDietaryCount?: number | null
  }) {
    setFilterInit({
      mainCategories: params.mainCategories ?? [],
      subCategories: params.subCategories ?? [],
      dietaryCategories: params.dietaryCategories ?? [],
      missing: params.missing ?? [],
      search: '',
      maxDietaryCount: params.maxDietaryCount ?? null,
    })
    setTab('filter')
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <TagIcon className="h-6 w-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">Tag administration</h1>
        </div>
        <p className="mt-1 text-gray-600">
          Få overblik over alle tags, filtrer opskrifter, ret tags i bulk og lad AI foreslå tags.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {(
          [
            { id: 'overview', label: 'Overblik' },
            { id: 'filter', label: 'Filter & redigér' },
            { id: 'cleanup', label: 'Sanering' },
          ] as Array<{ id: Tab; label: string }>
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && !overview && (
        <div className="flex items-center justify-center px-4 py-10 text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Henter tag-overblik...
        </div>
      )}

      {error && !overview && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {overview && tab === 'overview' && (
        <OverviewTab overview={overview} onRenameRequest={openRename} />
      )}

      {overview && tab === 'filter' && (
        <FilterTab
          overview={overview}
          initialFilters={filterInit}
          onReloadOverview={reload}
        />
      )}

      {overview && tab === 'cleanup' && (
        <CleanupTab
          overview={overview}
          onLoadFilteredView={openFilteredView}
          onRenameRequest={openRename}
        />
      )}

      {renameState && overview && (
        <RenameModal
          state={renameState}
          overview={overview}
          onClose={() => setRenameState(null)}
          onComplete={async () => {
            setRenameState(null)
            await reload()
          }}
        />
      )}
    </div>
  )
}
