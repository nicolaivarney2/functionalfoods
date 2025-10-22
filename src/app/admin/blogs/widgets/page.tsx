'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'

interface BlogWidget {
  id: number
  name: string
  widget_type: string
  title: string
  content: string
  is_active: boolean
  created_at: string
  updated_at: string
}

const WIDGET_TYPES = [
  { value: 'reddit_community', label: 'Reddit Community', description: 'Vis Reddit community widget' },
  { value: 'cta_button', label: 'CTA Button', description: 'Call-to-action knap' },
  { value: 'related_posts', label: 'Related Posts', description: 'Relaterede blog indlæg' },
  { value: 'newsletter_signup', label: 'Newsletter Signup', description: 'Nyhedsbrev tilmelding' },
  { value: 'product_recommendation', label: 'Product Recommendation', description: 'Produkt anbefaling' }
]

export default function BlogWidgetsPage() {
  const [widgets, setWidgets] = useState<BlogWidget[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingWidget, setEditingWidget] = useState<BlogWidget | null>(null)
  const [saving, setSaving] = useState(false)

  const supabase = createSupabaseClient()

  useEffect(() => {
    loadWidgets()
  }, [])

  const loadWidgets = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_widgets')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setWidgets(data || [])
    } catch (error) {
      console.error('Error loading widgets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (widgetData: Partial<BlogWidget>) => {
    setSaving(true)
    try {
      if (editingWidget) {
        // Update existing widget
        const { error } = await supabase
          .from('blog_widgets')
          .update({
            ...widgetData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingWidget.id)

        if (error) throw error
      } else {
        // Create new widget
        const { error } = await supabase
          .from('blog_widgets')
          .insert([widgetData])

        if (error) throw error
      }

      await loadWidgets()
      setShowCreateModal(false)
      setEditingWidget(null)
    } catch (error) {
      console.error('Error saving widget:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Er du sikker på at du vil slette denne widget?')) return

    try {
      const { error } = await supabase
        .from('blog_widgets')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadWidgets()
    } catch (error) {
      console.error('Error deleting widget:', error)
    }
  }

  const toggleActive = async (id: number, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('blog_widgets')
        .update({ is_active: !isActive })
        .eq('id', id)

      if (error) throw error
      await loadWidgets()
    } catch (error) {
      console.error('Error toggling widget status:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Indlæser widgets...</p>
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
              <h1 className="text-xl font-semibold text-gray-900">Blog Widgets</h1>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ny Widget
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {widgets.map((widget) => (
            <div key={widget.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{widget.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{widget.widget_type.replace('_', ' ')}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleActive(widget.id, widget.is_active)}
                    className={`p-1 rounded ${
                      widget.is_active 
                        ? 'text-green-600 hover:text-green-700' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {widget.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  
                  <button
                    onClick={() => setEditingWidget(widget)}
                    className="p-1 text-blue-600 hover:text-blue-700"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(widget.id)}
                    className="p-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700">Titel:</span>
                  <p className="text-sm text-gray-600">{widget.title}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-700">Indhold:</span>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {typeof widget.content === 'string' ? widget.content : JSON.stringify(widget.content)}
                  </p>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    widget.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {widget.is_active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                  
                  <span className="text-xs text-gray-500">
                    {new Date(widget.created_at).toLocaleDateString('da-DK')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {widgets.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <Plus className="h-12 w-12" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Ingen widgets</h3>
            <p className="mt-1 text-sm text-gray-500">Kom i gang med at oprette din første widget.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ny Widget
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingWidget) && (
        <WidgetModal
          widget={editingWidget}
          onSave={handleSave}
          onClose={() => {
            setShowCreateModal(false)
            setEditingWidget(null)
          }}
          saving={saving}
        />
      )}
    </div>
  )
}

interface WidgetModalProps {
  widget: BlogWidget | null
  onSave: (widget: Partial<BlogWidget>) => void
  onClose: () => void
  saving: boolean
}

function WidgetModal({ widget, onSave, onClose, saving }: WidgetModalProps) {
  const [formData, setFormData] = useState({
    name: widget?.name || '',
    widget_type: widget?.widget_type || '',
    title: widget?.title || '',
    content: widget?.content || '',
    is_active: widget?.is_active ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Parse content based on widget type
    let parsedContent = formData.content
    if (formData.widget_type === 'reddit_community' || 
        formData.widget_type === 'related_posts' || 
        formData.widget_type === 'newsletter_signup') {
      try {
        parsedContent = JSON.parse(formData.content)
      } catch {
        // If not valid JSON, keep as string
      }
    }

    onSave({
      ...formData,
      content: parsedContent
    })
  }

  const getContentPlaceholder = (widgetType: string) => {
    switch (widgetType) {
      case 'reddit_community':
        return '{"subreddit": "keto", "description": "Connect with other keto enthusiasts"}'
      case 'related_posts':
        return '{"limit": 3, "category": "keto"}'
      case 'newsletter_signup':
        return '{"placeholder": "Din email", "button_text": "Tilmeld"}'
      case 'cta_button':
        return 'Klik her for at læse mere'
      case 'product_recommendation':
        return 'Anbefalet produkt: Keto snacks'
      default:
        return 'Widget indhold'
    }
  }

  const getContentLabel = (widgetType: string) => {
    switch (widgetType) {
      case 'reddit_community':
      case 'related_posts':
      case 'newsletter_signup':
        return 'JSON Konfiguration'
      default:
        return 'Indhold'
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {widget ? 'Rediger Widget' : 'Ny Widget'}
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
                Widget Navn *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="f.eks. Reddit Keto Community"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Widget Type *
              </label>
              <select
                value={formData.widget_type}
                onChange={(e) => setFormData(prev => ({ ...prev, widget_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Vælg widget type</option>
                {WIDGET_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titel *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="f.eks. Join Keto Community"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {getContentLabel(formData.widget_type)} *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={getContentPlaceholder(formData.widget_type)}
                required
              />
              {['reddit_community', 'related_posts', 'newsletter_signup'].includes(formData.widget_type) && (
                <p className="mt-1 text-sm text-gray-500">
                  Indtast JSON konfiguration for denne widget type
                </p>
              )}
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
                Aktiv widget
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
                    Gem Widget
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
