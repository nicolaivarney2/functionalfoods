'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Save, 
  Eye, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Link as LinkIcon
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'

interface BlogCategory {
  id: number
  name: string
  slug: string
  description: string
  color: string
}

interface BlogWidget {
  id: number
  name: string
  widget_type: string
  title: string
  content: string
  is_active: boolean
}

interface ContentSection {
  id?: number
  section_type: 'introduction' | 'content' | 'widget' | 'conclusion'
  section_order: number
  title?: string
  heading?: string  // Add heading property
  content: string
  image_url?: string
  widget_id?: number
}

interface BlogPost {
  id?: number
  title: string
  slug: string
  excerpt: string
  content: string
  category_id: number
  post_type: 'core' | 'blog'
  parent_id?: number
  is_evidence_based: boolean
  disclaimer_text?: string
  breadcrumb_path: string[]
  status: 'draft' | 'published' | 'archived'
  published_at?: string
  meta_title?: string
  meta_description?: string
  tags: string[]
  sections: ContentSection[]
}

export default function EnhancedBlogEditor() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [widgets, setWidgets] = useState<BlogWidget[]>([])
  const [showEvidenceModal, setShowEvidenceModal] = useState(false)
  
  const [blogPost, setBlogPost] = useState<BlogPost>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category_id: 1,
    post_type: 'blog',
    is_evidence_based: false,
    disclaimer_text: 'Denne artikel er baseret på evidensbaseret forskning og opdateret faglig viden. Det betyder, at vi nogle steder har markeret udtalelser med et ¹ ² ³ som er links til understøttende studier. Find referencelist i bunden af artiklen.',
    breadcrumb_path: ['Keto', 'Blogs'],
    status: 'draft',
    meta_title: '',
    meta_description: '',
    tags: [],
    sections: [
      {
        section_type: 'introduction',
        section_order: 1,
        content: ''
      }
    ]
  })

  const supabase = createSupabaseClient()

  useEffect(() => {
    loadCategories()
    loadWidgets()
    loadExistingBlog()
  }, [])

  const loadExistingBlog = async () => {
    const urlParams = new URLSearchParams(window.location.search)
    const blogId = urlParams.get('id')
    
    if (blogId) {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', blogId)
          .single()

        if (error) {
          console.error('Error loading blog:', error)
          return
        }

        if (data) {
          // Load sections from database
          const { data: sections, error: sectionsError } = await supabase
            .from('blog_post_sections')
            .select('*')
            .eq('blog_post_id', data.id)
            .order('section_order')

          setBlogPost({
            id: data.id,
            title: data.title || '',
            slug: data.slug || '',
            excerpt: data.excerpt || '',
            content: data.content || '',
            category_id: data.category_id || 1,
            post_type: data.post_type || 'blog',
            parent_id: data.parent_id,
            is_evidence_based: data.is_evidence_based || false,
            disclaimer_text: data.disclaimer_text || 'Denne artikel er baseret på evidensbaseret forskning og opdateret faglig viden. Det betyder, at vi nogle steder har markeret udtalelser med et ¹ ² ³ som er links til understøttende studier. Find referencelist i bunden af artiklen.',
            breadcrumb_path: data.breadcrumb_path || ['Keto', 'Blogs'],
            status: data.status || 'draft',
            meta_title: data.meta_title || '',
            meta_description: data.meta_description || '',
            tags: data.tags || [],
            sections: sections && sections.length > 0 ? sections : [
              {
                section_type: 'introduction',
                section_order: 1,
                content: data.content || ''
              }
            ]
          })
        }
      } catch (error) {
        console.error('Error loading blog:', error)
      }
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

  const loadWidgets = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_widgets')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      setWidgets(data || [])
    } catch (error) {
      console.error('Error loading widgets:', error)
    }
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const generateBreadcrumb = (categoryId: number, postType: string) => {
    const category = categories.find(c => c.id === categoryId)
    if (!category) return ['Keto', 'Blogs']
    
    if (postType === 'core') {
      return [category.name, 'Kerneartikler']
    } else {
      return [category.name, 'Blogs']
    }
  }

  const handleTitleChange = (title: string) => {
    setBlogPost(prev => ({
      ...prev,
      title,
      slug: generateSlug(title),
      meta_title: prev.meta_title || title
    }))
  }

  const handleCategoryChange = (categoryId: number) => {
    setBlogPost(prev => ({
      ...prev,
      category_id: categoryId,
      breadcrumb_path: generateBreadcrumb(categoryId, prev.post_type)
    }))
  }

  const handlePostTypeChange = (postType: 'core' | 'blog') => {
    setBlogPost(prev => ({
      ...prev,
      post_type: postType,
      breadcrumb_path: generateBreadcrumb(prev.category_id, postType)
    }))
  }

  const addContentSection = () => {
    const newOrder = Math.max(...blogPost.sections.map(s => s.section_order)) + 1
    setBlogPost(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          section_type: 'content',
          section_order: newOrder,
          title: '',
          content: '',
          image_url: ''
        }
      ]
    }))
  }

  const addWidgetSection = (widgetId: number) => {
    const newOrder = Math.max(...blogPost.sections.map(s => s.section_order)) + 1
    setBlogPost(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          section_type: 'widget',
          section_order: newOrder,
          widget_id: widgetId,
          content: ''
        }
      ]
    }))
  }

  const addConclusionSection = () => {
    const newOrder = Math.max(...blogPost.sections.map(s => s.section_order)) + 1
    setBlogPost(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          section_type: 'conclusion',
          section_order: newOrder,
          content: ''
        }
      ]
    }))
  }

  const updateSection = (index: number, updates: Partial<ContentSection>) => {
    setBlogPost(prev => ({
      ...prev,
      sections: prev.sections.map((section, i) => 
        i === index ? { ...section, ...updates } : section
      )
    }))
  }

  const removeSection = (index: number) => {
    setBlogPost(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }))
  }

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= blogPost.sections.length) return

    setBlogPost(prev => {
      const newSections = [...prev.sections]
      const [movedSection] = newSections.splice(index, 1)
      newSections.splice(newIndex, 0, movedSection)
      
      // Update section orders
      return {
        ...prev,
        sections: newSections.map((section, i) => ({
          ...section,
          section_order: i + 1
        }))
      }
    })
  }

  const generateTableOfContents = () => {
    const contentSections = blogPost.sections.filter(s => s.section_type === 'content' && s.title)
    return contentSections.map((section, index) => ({
      title: section.title,
      anchor: `section-${index + 1}`,
      order: section.section_order
    }))
  }

  const generateContentFromSections = () => {
    // Generate HTML content from sections for the main content field
    let content = ''
    
    blogPost.sections.forEach((section, index) => {
      if (section.section_type === 'introduction') {
        content += `<div class="blog-section introduction-section">
          <div class="section-content">
            <p>${section.content}</p>
          </div>
        </div>`
      } else if (section.section_type === 'content') {
        content += `<div class="blog-section content-section">
          <h2 class="section-heading">${section.title || section.heading || `Sektion ${index}`}</h2>
          <div class="section-content">
            <p>${section.content}</p>
          </div>
        </div>`
      } else if (section.section_type === 'widget') {
        content += `<div class="blog-section widget-section">
          <div class="widget-placeholder">
            [Widget: ${section.widget_id || 'Widget'}]
          </div>
        </div>`
      } else if (section.section_type === 'conclusion') {
        content += `<div class="blog-section conclusion-section">
          <div class="section-content">
            <p>${section.content}</p>
          </div>
        </div>`
      }
    })
    
    return content || 'Indhold genereres fra sektioner...'
  }

  const handleSave = async (status: 'draft' | 'published') => {
    setSaving(true)
    try {
      // Remove sections from postData as they're saved separately
      const { sections, ...postData } = blogPost
      
      const finalPostData = {
        ...postData,
        content: generateContentFromSections(), // Generate content from sections
        excerpt: postData.excerpt || postData.title || 'Blog indlæg', // Ensure excerpt exists
        status,
        published_at: status === 'published' ? new Date().toISOString() : null
      }

      console.log('Sending data to API:', finalPostData)

      const isUpdate = blogPost.id
      const url = isUpdate ? `/api/blogs/${blogPost.id}` : '/api/blogs'
      const method = isUpdate ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify(finalPostData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(`Failed to save blog post: ${errorData.error || 'Unknown error'}`)
      }

      const result = await response.json()
      console.log('Blog post saved:', result)
      
      // Save sections separately
      if (result.post?.id) {
        await saveSections(result.post.id)
      }

      router.push('/admin/blogs')
    } catch (error) {
      console.error('Error saving blog post:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ukendt fejl'
      alert(`Fejl ved gemning: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  const saveSections = async (blogPostId: number) => {
    try {
      // Delete existing sections
      await supabase
        .from('blog_content_sections')
        .delete()
        .eq('blog_post_id', blogPostId)

      // Insert new sections
      const sectionsToInsert = blogPost.sections.map(section => ({
        blog_post_id: blogPostId,
        ...section
      }))

      const { error } = await supabase
        .from('blog_content_sections')
        .insert(sectionsToInsert)

      if (error) throw error
    } catch (error) {
      console.error('Error saving sections:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                {blogPost.id ? 'Rediger Blog' : 'Ny Blog'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                {saving ? 'Gemmer...' : 'Gem Kladde'}
              </button>
              <button
                onClick={() => handleSave('published')}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Udgiver...' : 'Udgiv'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Blog Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Blog Header</h2>
              
              {/* Auto-generated Breadcrumb */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Breadcrumb Path (auto-genereret)
                </label>
                <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                  {blogPost.breadcrumb_path.map((item, index) => (
                    <div key={index} className="flex items-center">
                      {index > 0 && <span className="text-gray-400 mx-2">›</span>}
                      <span className="text-sm text-gray-700 hover:text-blue-600 cursor-pointer">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Breadcrumb opdateres automatisk baseret på kategori og post type
                </p>
              </div>

              {/* Title */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titel *
                </label>
                <input
                  type="text"
                  value={blogPost.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Indtast blog titel"
                />
              </div>

              {/* Evidence Based Badge */}
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={blogPost.is_evidence_based}
                    onChange={(e) => setBlogPost(prev => ({
                      ...prev,
                      is_evidence_based: e.target.checked
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Evidensbaseret artikel
                  </span>
                </label>
              </div>

              {/* Disclaimer */}
              {blogPost.is_evidence_based && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Disclaimer Tekst
                  </label>
                  <textarea
                    value={blogPost.disclaimer_text || ''}
                    onChange={(e) => setBlogPost(prev => ({
                      ...prev,
                      disclaimer_text: e.target.value
                    }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Denne artikel er baseret på evidensbaseret forskning..."
                  />
                </div>
              )}
            </div>

            {/* Content Sections */}
            {blogPost.sections.map((section, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {section.section_type === 'introduction' && 'Indledning & Indholdsfortegnelse'}
                    {section.section_type === 'content' && `Indholdsboks ${index}`}
                    {section.section_type === 'widget' && 'Widget Sektion'}
                    {section.section_type === 'conclusion' && 'Afslutning'}
                  </h3>
                  
                  <div className="flex items-center space-x-2">
                    {index > 0 && (
                      <button
                        onClick={() => moveSection(index, 'up')}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <MoveUp className="h-4 w-4" />
                      </button>
                    )}
                    {index < blogPost.sections.length - 1 && (
                      <button
                        onClick={() => moveSection(index, 'down')}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <MoveDown className="h-4 w-4" />
                      </button>
                    )}
                    {section.section_type !== 'introduction' && (
                      <button
                        onClick={() => removeSection(index)}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Section Content */}
                {section.section_type === 'introduction' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Indledningstekst
                    </label>
                    <textarea
                      value={section.content}
                      onChange={(e) => updateSection(index, { content: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Skriv en indledning til artiklen..."
                    />
                    
                    {/* Auto-generated Table of Contents */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-md">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Indholdsfortegnelse (auto-genereret)</h4>
                      <div className="text-sm text-gray-600">
                        {generateTableOfContents().length > 0 ? (
                          <ul className="space-y-1">
                            {generateTableOfContents().map((item, tocIndex) => (
                              <li key={tocIndex} className="flex items-center">
                                <span className="mr-2">•</span>
                                {item.title}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500">Tilføj indholdsbokse med overskrifter for at generere indholdsfortegnelse</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {section.section_type === 'content' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Overskrift
                      </label>
                      <input
                        type="text"
                        value={section.title || ''}
                        onChange={(e) => updateSection(index, { title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Indtast overskrift"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Indhold
                      </label>
                      <textarea
                        value={section.content}
                        onChange={(e) => updateSection(index, { content: e.target.value })}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Skriv indholdet her..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Billede URL
                      </label>
                      <input
                        type="url"
                        value={section.image_url || ''}
                        onChange={(e) => updateSection(index, { image_url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  </div>
                )}

                {section.section_type === 'widget' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vælg Widget
                    </label>
                    <select
                      value={section.widget_id || ''}
                      onChange={(e) => updateSection(index, { widget_id: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Vælg en widget</option>
                      {widgets.map(widget => (
                        <option key={widget.id} value={widget.id}>
                          {widget.name} ({widget.widget_type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {section.section_type === 'conclusion' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Afslutningstekst
                    </label>
                    <textarea
                      value={section.content}
                      onChange={(e) => updateSection(index, { content: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Skriv en afslutning til artiklen..."
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Add Section Buttons */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Tilføj Sektion</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={addContentSection}
                  className="flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Indholdsboks
                </button>
                
                <div className="relative">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addWidgetSection(parseInt(e.target.value))
                        e.target.value = ''
                      }
                    }}
                    className="flex items-center px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 appearance-none pr-8"
                  >
                    <option value="">Tilføj Widget</option>
                    {widgets.map(widget => (
                      <option key={widget.id} value={widget.id}>
                        {widget.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <button
                  onClick={addConclusionSection}
                  className="flex items-center px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Afslutning
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Blog Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Blog Indstillinger</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategori
                  </label>
                  <select
                    value={blogPost.category_id}
                    onChange={(e) => handleCategoryChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Post Type
                  </label>
                  <select
                    value={blogPost.post_type}
                    onChange={(e) => handlePostTypeChange(e.target.value as 'core' | 'blog')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="blog">Blog (Status 2)</option>
                    <option value="core">Kerneartikel (Status 1)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={blogPost.slug}
                    onChange={(e) => setBlogPost(prev => ({
                      ...prev,
                      slug: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Excerpt
                  </label>
                  <textarea
                    value={blogPost.excerpt}
                    onChange={(e) => setBlogPost(prev => ({
                      ...prev,
                      excerpt: e.target.value
                    }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Kort beskrivelse af bloggen..."
                  />
                </div>
              </div>
            </div>

            {/* SEO Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">SEO Indstillinger</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    value={blogPost.meta_title || ''}
                    onChange={(e) => setBlogPost(prev => ({
                      ...prev,
                      meta_title: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="SEO titel"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meta Description
                  </label>
                  <textarea
                    value={blogPost.meta_description || ''}
                    onChange={(e) => setBlogPost(prev => ({
                      ...prev,
                      meta_description: e.target.value
                    }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="SEO beskrivelse"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (kommasepareret)
                  </label>
                  <input
                    type="text"
                    value={blogPost.tags.join(', ')}
                    onChange={(e) => setBlogPost(prev => ({
                      ...prev,
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="keto, vægttab, diæt"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Evidence Based Modal */}
      {showEvidenceModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="mt-2 px-7 py-3">
                <h3 className="text-lg font-medium text-gray-900">Evidensbaseret Artikel</h3>
                <div className="mt-2 px-1 py-3">
                  <p className="text-sm text-gray-500">
                    {blogPost.disclaimer_text || 'Denne artikel er baseret på evidensbaseret forskning og opdateret faglig viden.'}
                  </p>
                </div>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={() => setShowEvidenceModal(false)}
                  className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
