'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { Search, X, ArrowRight } from 'lucide-react'
import type { Recipe } from '@/types/recipe'

interface RecipeSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function RecipeSearchModal({ isOpen, onClose }: RecipeSearchModalProps) {
  const [query, setQuery] = useState('')
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const loadedRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 50)
    if (!loadedRef.current) {
      loadedRef.current = true
      setLoading(true)
      fetch('/api/recipes')
        .then((r) => r.json())
        .then((data) => {
          const recipes = data.recipes ?? data
          setAllRecipes(Array.isArray(recipes) ? recipes : [])
        })
        .catch(() => setAllRecipes([]))
        .finally(() => setLoading(false))
    }
    return () => window.clearTimeout(t)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) setQuery('')
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const q = query.trim().toLowerCase()
  const searchResults =
    q.length > 0
      ? allRecipes
          .filter(
            (recipe) =>
              recipe.title.toLowerCase().includes(q) ||
              (recipe.description && recipe.description.toLowerCase().includes(q)) ||
              (recipe.shortDescription && recipe.shortDescription.toLowerCase().includes(q))
          )
          .slice(0, 8)
      : []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    window.location.href = `/opskriftsoversigt?search=${encodeURIComponent(query.trim())}`
    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-start justify-center overflow-y-auto p-4 pt-16 sm:pt-24">
      <button
        type="button"
        className="fixed inset-0 bg-black/60"
        aria-label="Luk søgning"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-search-title"
        className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 id="recipe-search-title" className="text-lg font-semibold text-slate-900">
            Søg opskrifter
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Luk"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Skriv fx kylling, salat, keto …"
              autoComplete="off"
              className="w-full rounded-lg border border-slate-300 py-3 pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
          {loading && <p className="mt-3 text-sm text-slate-500">Indlæser opskrifter…</p>}

          {!loading && query.trim().length > 0 && searchResults.length > 0 && (
            <ul className="mt-3 max-h-[min(50vh,320px)] overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-100">
              {searchResults.map((recipe) => (
                <li key={recipe.id}>
                  <Link
                    href={`/opskrift/${recipe.slug}`}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50/80 transition-colors"
                    onClick={onClose}
                  >
                    {recipe.imageUrl ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-100">
                        <Image
                          src={recipe.imageUrl}
                          alt={recipe.imageAlt || recipe.title}
                          width={48}
                          height={48}
                          className="h-12 w-12 object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 shrink-0 rounded-md bg-slate-100" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">{recipe.title}</p>
                      {recipe.totalTime != null && (
                        <p className="text-xs text-slate-500">{recipe.totalTime} min</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {!loading && query.trim().length > 0 && searchResults.length === 0 && (
            <p className="mt-3 text-sm text-slate-600">Ingen opskrifter matcher – prøv et andet ord eller se alle filtre.</p>
          )}

          {query.trim().length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/opskriftsoversigt?search=${encodeURIComponent(query.trim())}`}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
                onClick={onClose}
              >
                Se alle resultater
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>,
    document.body
  )
}
