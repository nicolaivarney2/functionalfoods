'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, ArrowLeft, ExternalLink, Users, MessageSquare } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'

interface RedditCommunity {
  id: number
  name: string
  subreddit: string
  description: string
  category: string
  member_count?: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

const COMMUNITY_CATEGORIES = [
  'Keto',
  'LCHF/Paleo', 
  'Proteinrig kost',
  'Anti-inflammatory',
  'Flexitarian',
  '5:2 Diet',
  'Family Food',
  'General'
]

export default function RedditCommunitiesPage() {
  const [communities, setCommunities] = useState<RedditCommunity[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCommunity, setEditingCommunity] = useState<RedditCommunity | null>(null)
  const [saving, setSaving] = useState(false)

  const supabase = createSupabaseClient()

  useEffect(() => {
    loadCommunities()
  }, [])

  const loadCommunities = async () => {
    try {
      const { data, error } = await supabase
        .from('reddit_communities')
        .select('*')
        .order('sort_order', { ascending: true })
      
      if (error) throw error
      setCommunities(data || [])
    } catch (error) {
      console.error('Error loading communities:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (communityData: Partial<RedditCommunity>) => {
    setSaving(true)
    try {
      if (editingCommunity) {
        // Update existing community
        const { error } = await supabase
          .from('reddit_communities')
          .update({
            ...communityData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCommunity.id)

        if (error) throw error
      } else {
        // Create new community
        const maxOrder = Math.max(...communities.map(c => c.sort_order), 0)
        const { error } = await supabase
          .from('reddit_communities')
          .insert([{
            ...communityData,
            sort_order: maxOrder + 1
          }])

        if (error) throw error
      }

      await loadCommunities()
      setShowCreateModal(false)
      setEditingCommunity(null)
    } catch (error) {
      console.error('Error saving community:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Er du sikker på at du vil slette denne Reddit community?')) return

    try {
      const { error } = await supabase
        .from('reddit_communities')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadCommunities()
    } catch (error) {
      console.error('Error deleting community:', error)
    }
  }

  const toggleActive = async (id: number, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('reddit_communities')
        .update({ is_active: !isActive })
        .eq('id', id)

      if (error) throw error
      await loadCommunities()
    } catch (error) {
      console.error('Error toggling community status:', error)
    }
  }

  const moveCommunity = async (id: number, direction: 'up' | 'down') => {
    const currentIndex = communities.findIndex(c => c.id === id)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= communities.length) return

    const newCommunities = [...communities]
    const [movedCommunity] = newCommunities.splice(currentIndex, 1)
    newCommunities.splice(newIndex, 0, movedCommunity)

    // Update sort orders
    const updates = newCommunities.map((community, index) => ({
      id: community.id,
      sort_order: index + 1
    }))

    try {
      for (const update of updates) {
        const { error } = await supabase
          .from('reddit_communities')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id)

        if (error) throw error
      }
      await loadCommunities()
    } catch (error) {
      console.error('Error moving community:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Indlæser Reddit communities...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Reddit Communities</h1>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ny Community
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Communities List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {communities.map((community, index) => (
              <li key={community.id}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-orange-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          r/{community.subreddit}
                        </p>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          community.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {community.is_active ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </div>
                      <div className="flex items-center mt-1">
                        <p className="text-sm text-gray-500">{community.name}</p>
                        <span className="mx-2 text-gray-300">•</span>
                        <p className="text-sm text-gray-500">{community.category}</p>
                        {community.member_count && (
                          <>
                            <span className="mx-2 text-gray-300">•</span>
                            <div className="flex items-center text-sm text-gray-500">
                              <Users className="h-3 w-3 mr-1" />
                              {community.member_count.toLocaleString()}
                            </div>
                          </>
                        )}
                      </div>
                      {community.description && (
                        <p className="text-sm text-gray-600 mt-1">{community.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <a
                      href={`https://reddit.com/r/${community.subreddit}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    
                    <button
                      onClick={() => moveCommunity(community.id, 'up')}
                      disabled={index === 0}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ↑
                    </button>
                    
                    <button
                      onClick={() => moveCommunity(community.id, 'down')}
                      disabled={index === communities.length - 1}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ↓
                    </button>
                    
                    <button
                      onClick={() => toggleActive(community.id, community.is_active)}
                      className={`p-2 rounded ${
                        community.is_active 
                          ? 'text-green-600 hover:text-green-700' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {community.is_active ? '✓' : '○'}
                    </button>
                    
                    <button
                      onClick={() => setEditingCommunity(community)}
                      className="p-2 text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(community.id)}
                      className="p-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {communities.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <MessageSquare className="h-12 w-12" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Ingen Reddit communities</h3>
            <p className="mt-1 text-sm text-gray-500">Kom i gang med at tilføje Reddit communities.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ny Community
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingCommunity) && (
        <CommunityModal
          community={editingCommunity}
          onSave={handleSave}
          onClose={() => {
            setShowCreateModal(false)
            setEditingCommunity(null)
          }}
          saving={saving}
        />
      )}
    </div>
  )
}

interface CommunityModalProps {
  community: RedditCommunity | null
  onSave: (community: Partial<RedditCommunity>) => void
  onClose: () => void
  saving: boolean
}

function CommunityModal({ community, onSave, onClose, saving }: CommunityModalProps) {
  const [formData, setFormData] = useState({
    name: community?.name || '',
    subreddit: community?.subreddit || '',
    description: community?.description || '',
    category: community?.category || 'Keto',
    member_count: community?.member_count || 0,
    is_active: community?.is_active ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {community ? 'Rediger Reddit Community' : 'Ny Reddit Community'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Community Navn *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="f.eks. Keto Community"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subreddit Navn *
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  r/
                </span>
                <input
                  type="text"
                  value={formData.subreddit}
                  onChange={(e) => setFormData(prev => ({ ...prev, subreddit: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="keto"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {COMMUNITY_CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beskrivelse
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Kort beskrivelse af community..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medlemstal (valgfrit)
              </label>
              <input
                type="number"
                value={formData.member_count}
                onChange={(e) => setFormData(prev => ({ ...prev, member_count: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                min="0"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                Aktiv community
              </label>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Annuller
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Gemmer...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Gem Community
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
