'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  EXCLUSION_TAGS,
  parseIngredientTags,
  suggestExclusionTagsFromName,
  type ExclusionTagId,
} from '@/lib/dietary-exclusions'

interface IngredientTagEditorProps {
  ingredientId: string
  name: string
  exclusions?: unknown
  compact?: boolean
  onUpdated?: (tags: string[]) => void
}

/** Kun fravalg-tags (pork, æg, fisk …). Økologi styres på varer ved indkøb. */
export function IngredientTagEditor({
  ingredientId,
  name,
  exclusions,
  compact = false,
  onUpdated,
}: IngredientTagEditorProps) {
  const parsed = useMemo(() => parseIngredientTags(exclusions), [exclusions])
  const [foodTags, setFoodTags] = useState<ExclusionTagId[]>(parsed.foodExclusions)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFoodTags(parsed.foodExclusions)
  }, [ingredientId, parsed.foodExclusions])

  const suggestedFood = useMemo(
    () => suggestExclusionTagsFromName(name).filter((t) => !foodTags.includes(t)),
    [name, foodTags]
  )

  const patchTags = useCallback(
    async (patch: Record<string, string[]>) => {
      setSaving(true)
      setError(null)
      try {
        const res = await fetch('/api/admin/exclusions/ingredients', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingredientIds: [ingredientId], ...patch }),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Kunne ikke gemme tags')

        let nextFood = [...foodTags]
        if (patch.setFoodTags) nextFood = patch.setFoodTags as ExclusionTagId[]
        if (patch.addFoodTags) {
          nextFood = [...new Set([...nextFood, ...(patch.addFoodTags as ExclusionTagId[])])]
        }
        if (patch.removeFoodTags) {
          nextFood = nextFood.filter((t) => !patch.removeFoodTags!.includes(t))
        }

        setFoodTags(nextFood)
        onUpdated?.(nextFood)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fejl ved gem')
      } finally {
        setSaving(false)
      }
    },
    [ingredientId, foodTags, onUpdated]
  )

  const toggleFood = (tag: ExclusionTagId, active: boolean) => {
    void patchTags(active ? { removeFoodTags: [tag] } : { addFoodTags: [tag] })
  }

  const labelClass = compact
    ? 'text-[10px] uppercase tracking-wide text-gray-500'
    : 'text-xs font-medium text-gray-600'

  return (
    <div
      className={
        compact ? 'mt-2 space-y-1.5' : 'mt-3 space-y-2 rounded-lg border border-gray-100 bg-gray-50/80 p-3'
      }
    >
      {!compact && (
        <p className="text-xs text-gray-500">
          Fravalg-tags på ingrediensen (pork, æg, fisk …). Økologi vælges på varer ved indkøb.
        </p>
      )}

      <div>
        <div className={labelClass}>Fravalg</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {EXCLUSION_TAGS.map((tag) => {
            const active = foodTags.includes(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                disabled={saving}
                title={tag.description}
                onClick={() => toggleFood(tag.id, active)}
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  active ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tag.label}
              </button>
            )
          })}
        </div>
        {suggestedFood.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {suggestedFood.map((tag) => (
              <button
                key={tag}
                type="button"
                disabled={saving}
                onClick={() => void patchTags({ addFoodTags: [tag] })}
                className="rounded-full border border-dashed border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-800 hover:bg-amber-100"
              >
                + {EXCLUSION_TAGS.find((t) => t.id === tag)?.label ?? tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {saving && <p className="text-[10px] text-gray-400">Gemmer…</p>}
      {error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  )
}
