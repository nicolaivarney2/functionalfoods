'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  EXCLUSION_TAGS,
  type ExclusionTagId,
  type OrganicTagId,
} from '@/lib/dietary-exclusions'

type TagFilter =
  | ExclusionTagId
  | OrganicTagId
  | 'all'
  | 'untagged'
  | 'untagged-food'

interface TagOverview {
  id: string
  label: string
  description: string
  ingredientCount: number
  productCount?: number
  isAnimalProduct?: boolean
  familySetting?: string
}

interface OrganicProductStat {
  id: string
  label: string
  description: string
  productCount: number
}

interface ProductStats {
  totalProducts: number
  organicPriority: number
  organicAnimal: number
}

interface IngredientRow {
  id: string
  name: string
  category: string | null
  foodExclusions: ExclusionTagId[]
  organicTags: OrganicTagId[]
  suggestedFoodTags: ExclusionTagId[]
  suggestedOrganicTags: OrganicTagId[]
}

interface OverviewStats {
  totalIngredients: number
  foodTaggedIngredients: number
  anyTaggedIngredients: number
  untaggedIngredients: number
  coveragePercent: number
}

export default function ExclusionsAdminPage() {
  const [exclusionTags, setExclusionTags] = useState<TagOverview[]>([])
  const [organicProductStats, setOrganicProductStats] = useState<OrganicProductStat[]>([])
  const [productStats, setProductStats] = useState<ProductStats | null>(null)
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [ingredients, setIngredients] = useState<IngredientRow[]>([])
  const [loadingOverview, setLoadingOverview] = useState(true)
  const [loadingIngredients, setLoadingIngredients] = useState(true)
  const [saving, setSaving] = useState(false)
  const [overviewError, setOverviewError] = useState<string | null>(null)
  const [ingredientsError, setIngredientsError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [selectedTag, setSelectedTag] = useState<TagFilter>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true)
    try {
      const res = await fetch('/api/admin/exclusions')
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Kunne ikke hente oversigt')
      setExclusionTags(data.exclusionTags)
      setOrganicProductStats(data.organicProductStats ?? data.organicTags ?? [])
      setProductStats(data.productStats ?? null)
      setStats(data.stats)
      setOverviewError(null)
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : 'Fejl ved indlæsning')
    } finally {
      setLoadingOverview(false)
    }
  }, [])

  const loadIngredients = useCallback(async () => {
    setLoadingIngredients(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
        tag: selectedTag,
      })
      if (search.trim().length >= 2) params.set('search', search.trim())

      const res = await fetch(`/api/admin/exclusions/ingredients?${params}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Kunne ikke hente ingredienser')
      setIngredients(data.ingredients)
      setTotalPages(data.pagination.totalPages)
      setIngredientsError(null)
    } catch (err) {
      setIngredientsError(err instanceof Error ? err.message : 'Fejl ved indlæsning')
    } finally {
      setLoadingIngredients(false)
    }
  }, [page, search, selectedTag])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  useEffect(() => {
    void loadIngredients()
  }, [loadIngredients])

  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [selectedTag, search])

  const selectedMeta = useMemo(() => {
    if (selectedTag === 'all' || selectedTag === 'untagged' || selectedTag === 'untagged-food') {
      return null
    }
    return exclusionTags.find((t) => t.id === selectedTag) ?? null
  }, [selectedTag, exclusionTags])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === ingredients.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(ingredients.map((i) => i.id)))
    }
  }

  const patchTags = async (
    ingredientIds: string[],
    patch: Record<string, string[]>
  ) => {
    if (ingredientIds.length === 0) return
    setSaving(true)
    setOverviewError(null)
    setIngredientsError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/admin/exclusions/ingredients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientIds, ...patch }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Opdatering fejlede')
      setSuccess(`Opdaterede ${data.updated} ingrediens${data.updated === 1 ? '' : 'er'}`)
      setSelectedIds(new Set())
      await Promise.all([loadOverview(), loadIngredients()])
    } catch (err) {
      setIngredientsError(err instanceof Error ? err.message : 'Fejl ved gem')
    } finally {
      setSaving(false)
    }
  }

  const setFoodTagsForIngredient = async (id: string, next: ExclusionTagId[]) => {
    await patchTags([id], { setFoodTags: next })
  }

  const addFoodTagToSelected = async (tagId: ExclusionTagId) => {
    await patchTags(Array.from(selectedIds), { addFoodTags: [tagId] })
  }

  const removeFoodTagFromSelected = async (tagId: ExclusionTagId) => {
    await patchTags(Array.from(selectedIds), { removeFoodTags: [tagId] })
  }

  const isGenericTagFilter =
    selectedTag === 'all' || selectedTag === 'untagged' || selectedTag === 'untagged-food'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fravalg-tags</h1>
            <p className="mt-1 max-w-3xl text-sm text-gray-600">
              Manuelle fravalg-tags (pork, æg, fisk, soja …) på ingredienser — styrer hvilke opskrifter
              der filtreres fra. Økologi er en indkøbsliste-ting på <strong>varer</strong> (ØKO i
              produktnavn); kør <code className="text-xs">npx tsx scripts/oko-scan-products.ts</code>{' '}
              for at sætte Økologi-label på varer.
            </p>
          </div>
        </div>

        {overviewError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {overviewError}
          </div>
        )}
        {ingredientsError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {ingredientsError}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {success}
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <StatCard label="Ingredienser" value={loadingOverview ? '…' : stats?.totalIngredients} />
          <StatCard
            label="Med tags"
            value={loadingOverview ? '…' : stats?.anyTaggedIngredients}
            accent="text-green-700"
          />
          <StatCard
            label="Uden tags"
            value={loadingOverview ? '…' : stats?.untaggedIngredients}
            accent="text-amber-700"
          />
          <StatCard
            label="Dækning"
            value={loadingOverview ? '…' : `${stats?.coveragePercent ?? 0}%`}
            accent="text-brand-700"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <SidebarSection
              title="Økologi (varer)"
              hint="Tags på produkter — ikke ingredienser. Opdateres med npm run oko:scan-products."
            >
              {organicProductStats.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700"
                >
                  <span>{tag.label}</span>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    {loadingOverview ? '…' : tag.productCount}
                  </span>
                </div>
              ))}
              {productStats && (
                <p className="px-3 pt-1 text-xs text-gray-500">
                  {productStats.totalProducts.toLocaleString('da-DK')} varer i alt
                </p>
              )}
            </SidebarSection>

            <SidebarSection title="Fravalg">
              <FilterButton active={selectedTag === 'all'} onClick={() => setSelectedTag('all')}>
                Alle ingredienser
              </FilterButton>
              <FilterButton
                active={selectedTag === 'untagged'}
                onClick={() => setSelectedTag('untagged')}
              >
                Uden tags
              </FilterButton>
              <FilterButton
                active={selectedTag === 'untagged-food'}
                onClick={() => setSelectedTag('untagged-food')}
              >
                Uden fravalg-tags
              </FilterButton>
              <hr className="my-2 border-gray-100" />
              {exclusionTags.map((tag) => (
                <FilterButton
                  key={tag.id}
                  active={selectedTag === tag.id}
                  onClick={() => setSelectedTag(tag.id as ExclusionTagId)}
                  count={tag.ingredientCount}
                  sub={tag.isAnimalProduct ? 'Animalsk' : undefined}
                >
                  {tag.label}
                </FilterButton>
              ))}
            </SidebarSection>

          </aside>

          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {selectedTag === 'all'
                      ? 'Alle ingredienser'
                      : selectedTag === 'untagged'
                        ? 'Uden tags'
                        : selectedTag === 'untagged-food'
                          ? 'Uden fravalg-tags'
                          : selectedMeta?.label}
                  </h2>
                  {selectedMeta?.description && (
                    <p className="text-xs text-gray-500">{selectedMeta.description}</p>
                  )}
                </div>
                <input
                  type="search"
                  placeholder="Søg ingrediens (min. 2 tegn)…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:max-w-xs"
                />
              </div>

              {selectedIds.size > 0 && (
                <div className="mt-3 space-y-2 rounded-lg bg-brand-50 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-brand-900">
                      {selectedIds.size} valgt
                    </span>
                    {!isGenericTagFilter && selectedMeta && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void removeFoodTagFromSelected(selectedTag as ExclusionTagId)}
                        className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Fjern fra {selectedMeta.label}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-brand-800">Tilføj fravalg-tag:</span>
                    {EXCLUSION_TAGS.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        disabled={saving}
                        onClick={() => void addFoodTagToSelected(tag.id)}
                        className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={ingredients.length > 0 && selectedIds.size === ingredients.length}
                        onChange={toggleSelectAll}
                        aria-label="Vælg alle"
                      />
                    </th>
                    <th className="px-4 py-3">Ingrediens</th>
                    <th className="px-4 py-3">Fravalg</th>
                    <th className="px-4 py-3">Foreslået</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingIngredients ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        Indlæser…
                      </td>
                    </tr>
                  ) : ingredients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        Ingen ingredienser fundet
                      </td>
                    </tr>
                  ) : (
                    ingredients.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/80 align-top">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(row.id)}
                            onChange={() => toggleSelect(row.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{row.name}</div>
                          <div className="text-xs text-gray-500">{row.category || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <TagPills
                            tags={EXCLUSION_TAGS}
                            active={row.foodExclusions}
                            disabled={saving}
                            onToggle={(tagId, active) => {
                              const next = active
                                ? row.foodExclusions.filter((t) => t !== tagId)
                                : [...row.foodExclusions, tagId as ExclusionTagId]
                              void setFoodTagsForIngredient(row.id, next)
                            }}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <SuggestionPills
                            row={row}
                            saving={saving}
                            onApply={(patch) => void patchTags([row.id], patch)}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-40"
                >
                  Forrige
                </button>
                <span className="text-sm text-gray-600">
                  Side {page} af {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-40"
                >
                  Næste
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent = 'text-gray-900',
}: {
  label: string
  value: string | number | undefined
  accent?: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent}`}>
        {value === undefined ? '—' : value}
      </p>
    </div>
  )
}

function SidebarSection({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {hint && <p className="mb-2 text-xs text-gray-500">{hint}</p>}
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
  count,
  sub,
  accent,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  count?: number
  sub?: string
  accent?: 'brand'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
        active
          ? accent === 'brand'
            ? 'bg-emerald-50 font-medium text-emerald-900'
            : 'bg-brand-50 font-medium text-brand-900'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span>{children}</span>
        {count !== undefined && (
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {count}
          </span>
        )}
      </span>
      {sub && <span className="mt-0.5 block text-xs text-gray-500">{sub}</span>}
    </button>
  )
}

function TagPills({
  tags,
  active,
  disabled,
  variant,
  onToggle,
}: {
  tags: ReadonlyArray<{ id: string; label: string }>
  active: string[]
  disabled: boolean
  variant?: 'organic'
  onToggle: (tagId: string, isActive: boolean) => void
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => {
        const isActive = active.includes(tag.id)
        return (
          <button
            key={tag.id}
            type="button"
            disabled={disabled}
            title={tag.label}
            onClick={() => onToggle(tag.id, isActive)}
            className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
              isActive
                ? variant === 'organic'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tag.label}
          </button>
        )
      })}
    </div>
  )
}

function SuggestionPills({
  row,
  saving,
  onApply,
}: {
  row: IngredientRow
  saving: boolean
  onApply: (patch: Record<string, string[]>) => void
}) {
  const food = row.suggestedFoodTags.filter((t) => !row.foodExclusions.includes(t))
  if (food.length === 0) {
    return <span className="text-xs text-gray-400">—</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {food.map((tag) => (
        <button
          key={`f-${tag}`}
          type="button"
          disabled={saving}
          onClick={() => onApply({ addFoodTags: [tag] })}
          className="rounded-full border border-dashed border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-800 hover:bg-amber-100"
        >
          + {EXCLUSION_TAGS.find((t) => t.id === tag)?.label ?? tag}
        </button>
      ))}
    </div>
  )
}
