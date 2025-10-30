'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Eye, Search, Filter, Calendar, User, Tag, ExternalLink, FileText, Settings } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'

interface BlogCategory {
  id: number
  name: string
  slug: string
  description: string
  color: string
}

interface BlogPost {
  id: number
  title: string
  slug: string
  excerpt: string
  content: string
  category_id: number
  author_id: string
  meta_title: string
  meta_description: string
  tags: string[]
  status: 'draft' | 'published' | 'archived'
  featured: boolean
  published_at: string
  reddit_post_id: string
  reddit_subreddit: string
  view_count: number
  comment_count: number
  created_at: string
  updated_at: string
  category: BlogCategory
}

export default function AdminBlogsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const supabase = createSupabaseClient()

  useEffect(() => {
    loadPosts()
    loadCategories()
  }, [])

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          category:blog_categories(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || post.category_id.toString() === categoryFilter

    return matchesSearch && matchesStatus && matchesCategory
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('da-DK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const editPost = (post: BlogPost) => {
    // Redirect to Enhanced Editor instead of modal
    window.location.href = `/admin/blogs/enhanced-editor?id=${post.id}`
  }

  const viewPost = (post: BlogPost) => {
    // Open in new tab with category-scoped URL
    const cat = post.category?.slug || 'keto'
    window.open(`/blog/${cat}/${post.slug}`, '_blank')
  }

  const deletePost = async (postId: number) => {
    if (!confirm('Er du sikker på at du vil slette denne post?')) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Du skal være logget ind for at slette posts')
        return
      }

      const response = await fetch(`/api/blogs/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        setPosts(posts.filter(post => post.id !== postId))
        alert('Post slettet succesfuldt')
      } else {
        const error = await response.json()
        alert(`Fejl ved sletning: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Der opstod en fejl ved sletning af posten')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Blog Management</h1>
              <p className="text-gray-600 mt-2">Administrer blog posts og kategorier</p>
            </div>
            <div className="flex items-center space-x-3">
              <a
                href="/admin/blogs/enhanced-editor"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <FileText size={20} />
                <span>Enhanced Editor</span>
              </a>
              <a
                href="/admin/blogs/widgets"
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <Settings size={20} />
                <span>Widgets</span>
              </a>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>Ny Blog Post</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Søg i posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Alle statuser</option>
              <option value="published">Publiceret</option>
              <option value="draft">Kladde</option>
              <option value="archived">Arkiveret</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Alle kategorier</option>
              {categories.map(category => (
                <option key={category.id} value={category.id.toString()}>
                  {category.name}
                </option>
              ))}
            </select>

            {/* Results Count */}
            <div className="flex items-center text-gray-600">
              <span>{filteredPosts.length} posts fundet</span>
            </div>
          </div>
        </div>

        {/* Posts Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Indlæser posts...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Post
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stats
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Handlinger
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPosts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-sm font-medium text-gray-900 truncate">
                                {post.title}
                              </h3>
                              {post.featured && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  Featured
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                              {post.excerpt || 'Ingen beskrivelse'}
                            </p>
                            {post.tags && post.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {post.tags.slice(0, 3).map((tag, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                  >
                                    <Tag size={12} className="mr-1" />
                                    {tag}
                                  </span>
                                ))}
                                {post.tags.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{post.tags.length - 3} flere
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: post.category.color }}
                        >
                          {post.category.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(post.status)}`}>
                          {post.status === 'published' ? 'Publiceret' : 
                           post.status === 'draft' ? 'Kladde' : 'Arkiveret'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Eye size={14} />
                            <span>{post.view_count}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <User size={14} />
                            <span>{post.comment_count}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar size={14} />
                          <span>{formatDate(post.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => editPost(post)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Rediger"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => viewPost(post)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Vis post"
                          >
                            <ExternalLink size={16} />
                          </button>
                          <button
                            onClick={() => deletePost(post.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Slet"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Empty State */}
        {!loading && filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <Search size={48} />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Ingen posts fundet</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Prøv at ændre dine søgekriterier.'
                : 'Kom i gang ved at oprette din første blog post.'}
            </p>
            {(!searchQuery && statusFilter === 'all' && categoryFilter === 'all') && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Opret første post
                </button>
              </div>
            )}
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingPost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Rediger Blog Post</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titel
                  </label>
                  <input
                    type="text"
                    defaultValue={editingPost.title}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug
                  </label>
                  <input
                    type="text"
                    defaultValue={editingPost.slug}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Beskrivelse
                  </label>
                  <textarea
                    defaultValue={editingPost.excerpt}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Indhold
                  </label>
                  <textarea
                    defaultValue={editingPost.content}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kategori
                    </label>
                    <select
                      defaultValue={editingPost.category_id}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      defaultValue={editingPost.status}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="draft">Kladde</option>
                      <option value="published">Publiceret</option>
                      <option value="archived">Arkiveret</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    defaultChecked={editingPost.featured}
                    className="rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Featured post
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Annuller
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement save functionality
                    alert('Gem funktionalitet kommer snart!')
                    setShowEditModal(false)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Gem Ændringer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
