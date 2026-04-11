'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown,
  CheckCircle,
  Sparkles,
  Upload
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
  takeaway?: string
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
  header_image_url?: string
  sections: ContentSection[]
}

interface TopicSuggestion {
  title: string
  primaryKeyword: string
  searchIntent: string
  whyNow: string
  gapReason: string
  suggestedAngle: string
  suggestedExcerpt: string
  suggestedMetaTitle: string
  suggestedMetaDescription: string
  suggestedTags: string[]
  suggestedOutline: string[]
  priority: 'high' | 'medium' | 'low'
}

interface BlogSeoBrief {
  recommendedTitle: string
  recommendedSlug: string
  searchIntent: string
  primaryKeyword: string
  secondaryKeywords: string[]
  readerPromise: string
  angle: string
  metaTitle: string
  metaDescription: string
  recommendedTags: string[]
  sectionPlan: string[]
  internalLinks: Array<{ title: string; slug: string; reason: string }>
  notes: string[]
}

/**
 * Udleder redigerbar tekst fra .section-content HTML. `element.textContent` klistrer
 * sammen uden mellemrum mellem </p><p> → "...ord.Næste" — derfor går vi blok for blok.
 */
function sectionHtmlToPlainText(contentEl: Element | null): string {
  if (!contentEl) return ''
  const chunks: string[] = []
  const pushLine = (s: string) => {
    const t = s.replace(/\s+/g, ' ').trim()
    if (t) chunks.push(t)
  }

  for (const child of Array.from(contentEl.children)) {
    const tag = child.tagName.toLowerCase()
    if (tag === 'img' || child.classList.contains('takeaway-box')) continue
    if (tag === 'p') {
      pushLine(child.textContent || '')
    } else if (tag === 'ul' || tag === 'ol') {
      child.querySelectorAll(':scope > li').forEach((li) => {
        pushLine(`- ${li.textContent || ''}`)
      })
    } else if (/^h[1-6]$/.test(tag)) {
      const level = Math.min(6, parseInt(tag[1], 10))
      const inner = (child.textContent || '').replace(/\s+/g, ' ').trim()
      if (inner) chunks.push(`${'#'.repeat(level)} ${inner}`)
    } else {
      pushLine(child.textContent || '')
    }
  }

  if (chunks.length > 0) return chunks.join('\n\n')
  const clone = contentEl.cloneNode(true) as HTMLElement
  clone.querySelectorAll('img, .takeaway-box').forEach((n) => n.remove())
  return (clone.textContent || '').replace(/\s+/g, ' ').trim()
}

/** Fuld HTML-streng → plain (fx fallback uden .blog-section) */
function htmlBlobToPlainText(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  const fromBlocks = sectionHtmlToPlainText(div)
  if (fromBlocks.length > 0) return fromBlocks
  return (div.innerText || div.textContent || '').replace(/\r\n/g, '\n').trim()
}

export default function EnhancedBlogEditor() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [widgets, setWidgets] = useState<BlogWidget[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showEvidenceModal, setShowEvidenceModal] = useState(false)
  const [generatingContent, setGeneratingContent] = useState<number | null>(null)
  const [generatingResume, setGeneratingResume] = useState(false)
  const [generatingSeo, setGeneratingSeo] = useState(false)
  const [suggestingTopics, setSuggestingTopics] = useState(false)
  const [generatingBrief, setGeneratingBrief] = useState<number | null>(null)
  const [generatingStructuredPost, setGeneratingStructuredPost] = useState<number | null>(null)
  const [regeneratingSection, setRegeneratingSection] = useState<number | null>(null)
  const [generatingTakeaway, setGeneratingTakeaway] = useState<number | null>(null)
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestion[]>([])
  const [topicSuggestionError, setTopicSuggestionError] = useState<string>('')
  const [selectedTopicBrief, setSelectedTopicBrief] = useState<BlogSeoBrief | null>(null)
  const [selectedTopicBriefTitle, setSelectedTopicBriefTitle] = useState<string>('')
  const [tagInput, setTagInput] = useState('')
  /** 'header' | sektionens index | null */
  const [uploadingBlogImage, setUploadingBlogImage] = useState<'header' | number | null>(null)
  const pendingBlogImageRef = useRef<{ kind: 'header' } | { kind: 'section'; index: number } | null>(null)
  const blogImageFileInputRef = useRef<HTMLInputElement>(null)

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
    header_image_url: '',
    sections: [
      {
        section_type: 'introduction',
        section_order: 1,
        content: ''
      }
    ]
  })

  const supabase = createSupabaseClient()

  // Ved indlæsning: linjeskift + typisk tabt mellemrum efter . ! ? før stort bogstav (HTML/copy-paste)
  const normalizeForEditor = (text: string): string => {
    if (!text) return ''
    let t = text.replace(/\r\n/g, '\n').trim()
    // Ikke punktum i ... (tre punktummer): (?<!\.) sikrer at vi ikke splitter ellipsis
    t = t.replace(/(?<!\.)[\.\!\?]([A-ZÆØÅ])/g, (match, letter: string) => `${match[0]} ${letter}`)
    return t
  }

  const sectionTextareaRefs = useRef<(HTMLTextAreaElement | null)[]>([])

  const insertMarkdownAroundSelection = (
    sectionIndex: number,
    before: string,
    after: string,
    setContent: (value: string) => void,
    currentValue: string
  ) => {
    const textarea = sectionTextareaRefs.current[sectionIndex]
    const start = textarea?.selectionStart ?? currentValue.length
    const end = textarea?.selectionEnd ?? currentValue.length
    const value = currentValue
    const selected = value.slice(start, end)
    const newValue = value.slice(0, start) + before + selected + after + value.slice(end)
    setContent(newValue)
    const selStart = start + before.length
    const selEnd = selStart + selected.length
    setTimeout(() => {
      const el = sectionTextareaRefs.current[sectionIndex]
      if (!el) return
      el.focus()
      el.setSelectionRange(selStart, selEnd)
    }, 0)
  }

  useEffect(() => {
    loadCategories()
    loadWidgets()
    loadCurrentUser()
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
          const { data: sections } = await supabase
            .from('blog_content_sections')
            .select('*')
            .eq('blog_post_id', data.id)
            .order('section_order')

          // If no sections exist, create default structure (TypeScript fix applied)
          let defaultSections: Array<{
            section_type: 'introduction' | 'content' | 'widget' | 'conclusion'
            section_order: number
            content: string
            title?: string
          }> = [
            {
              section_type: 'introduction' as const,
              section_order: 1,
              content: ''
            }
          ]

          // If sections exist, use them; otherwise create from content
          if (sections && sections.length > 0) {
            defaultSections = sections.map(section => ({
              ...section,
              content: normalizeForEditor(section.content || ''),
              section_type: section.section_type as 'introduction' | 'content' | 'widget' | 'conclusion',
              // Eksplicit så billed-URL ikke tabes (spread alene kan være fint, men vi sikrer feltet)
              image_url: section.image_url ?? '',
            }))
          } else if (data.content) {
            // Parse existing content by looking for .blog-section divs
            const parser = new DOMParser()
            const doc = parser.parseFromString(data.content, 'text/html')
            const sections = doc.querySelectorAll('.blog-section')
            
            if (sections.length > 0) {
              defaultSections = Array.from(sections).map((section, index) => {
                const heading = section.querySelector('.section-heading')
                const content = section.querySelector('.section-content')
                const sectionClass = section.className
                const imgEl = section.querySelector('img.section-image') as HTMLImageElement | null
                const imageUrlFromHtml = imgEl?.getAttribute('src')?.trim() || ''
                const widgetEl = section.querySelector('.blog-widget[data-widget-id]')
                const widgetIdAttr = widgetEl?.getAttribute('data-widget-id')
                const widgetIdParsed = widgetIdAttr ? parseInt(widgetIdAttr, 10) : NaN
                
                let sectionType: 'introduction' | 'content' | 'widget' | 'conclusion' = 'content'
                if (sectionClass.includes('introduction-section')) {
                  sectionType = 'introduction'
                } else if (sectionClass.includes('conclusion-section')) {
                  sectionType = 'conclusion'
                } else if (sectionClass.includes('resume-section')) {
                  sectionType = 'content' // Resume is treated as content
                } else if (sectionClass.includes('widget-section')) {
                  sectionType = 'widget'
                }
                
                const rawFromHtml = content
                  ? (() => {
                      const structured = sectionHtmlToPlainText(content)
                      const fallback = (content.textContent || '').trim()
                      return structured.length > 0 ? structured : fallback
                    })()
                  : (section.textContent || '').trim()

                return {
                  section_type: sectionType,
                  section_order: index + 1,
                  content: normalizeForEditor(rawFromHtml),
                  title: heading ? heading.textContent || undefined : undefined,
                  image_url: imageUrlFromHtml,
                  ...(sectionType === 'widget' && !Number.isNaN(widgetIdParsed)
                    ? { widget_id: widgetIdParsed }
                    : {}),
                }
              })
            } else {
              // Fallback: hele body som HTML — strip ikke med regex (ødelægger mellemrum mellem tags)
              const contentText = htmlBlobToPlainText(data.content)
              defaultSections = [{
                section_type: 'introduction' as const,
                section_order: 1,
                content: normalizeForEditor(contentText)
              }]
            }
          }

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
            header_image_url: data.header_image_url || '',
            sections: defaultSections
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

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error loading user profile:', error)
          return
        }

        setCurrentUser(profile)
      }
    } catch (error) {
      console.error('Error loading current user:', error)
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

  const getCurrentCategory = () => categories.find(c => c.id === blogPost.category_id)

  const scaffoldSectionsFromSuggestion = (suggestion: TopicSuggestion): ContentSection[] => {
    const outline = Array.isArray(suggestion.suggestedOutline)
      ? suggestion.suggestedOutline.filter(Boolean).slice(0, 6)
      : []

    const introContent = suggestion.suggestedAngle
      ? `Vinkel: ${suggestion.suggestedAngle}\n\n${suggestion.whyNow || ''}`.trim()
      : suggestion.whyNow || ''

    const sections: ContentSection[] = [
      {
        section_type: 'introduction',
        section_order: 1,
        content: introContent,
      }
    ]

    outline.forEach((heading, index) => {
      sections.push({
        section_type: 'content',
        section_order: index + 2,
        title: heading,
        heading,
        content: '',
      })
    })

    sections.push({
      section_type: 'conclusion',
      section_order: sections.length + 1,
      content: '',
      takeaway: suggestion.primaryKeyword,
    })

    return sections
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
    setTopicSuggestions([])
    setTopicSuggestionError('')
    setSelectedTopicBrief(null)
    setSelectedTopicBriefTitle('')
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
    // Ingen transformation af content her – trim eller linjeskift-normalisering ved hvert tastetryk kan forvirre markøren.
    // normalizeForEditor() bruges kun ved indlæsning fra DB.
    setBlogPost(prev => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === index ? { ...section, ...updates } : section
      )
    }))
  }

  const addTag = (raw: string) => {
    const value = raw.trim()
    if (!value) return
    setBlogPost(prev => ({
      ...prev,
      tags: Array.from(new Set([...(prev.tags || []), value]))
    }))
    setTagInput('')
  }

  const removeTag = (value: string) => {
    setBlogPost(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(t => t !== value)
    }))
  }

  const openHeaderImagePicker = () => {
    pendingBlogImageRef.current = { kind: 'header' }
    blogImageFileInputRef.current?.click()
  }

  const openSectionImagePicker = (sectionIndex: number) => {
    pendingBlogImageRef.current = { kind: 'section', index: sectionIndex }
    blogImageFileInputRef.current?.click()
  }

  const handleBlogImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const pending = pendingBlogImageRef.current
    e.target.value = ''
    if (!file || !pending) return

    const loadingKey = pending.kind === 'header' ? 'header' : pending.index
    setUploadingBlogImage(loadingKey)
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('purpose', pending.kind === 'header' ? 'header' : 'section')
      const resp = await fetch('/api/admin/upload-blog-section-image', {
        method: 'POST',
        body: formData,
      })
      const data = await resp.json()
      if (!resp.ok || !data.success) throw new Error(data.error || 'Upload fejlede')
      const url = data.imageUrl as string
      if (pending.kind === 'header') {
        setBlogPost(prev => ({ ...prev, header_image_url: url }))
      } else {
        updateSection(pending.index, { image_url: url })
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload fejlede')
    } finally {
      setUploadingBlogImage(null)
      pendingBlogImageRef.current = null
    }
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && tagInput === '' && blogPost.tags.length) {
      removeTag(blogPost.tags[blogPost.tags.length - 1])
    }
  }

  const generateSeoDescription = async () => {
    if (!blogPost.title) return
    try {
      setGeneratingSeo(true)
      const contentPreview = blogPost.sections
        .map(s => `${s.title || ''}\n${s.content || ''}`)
        .join('\n\n')
        .slice(0, 4000)

      const resp = await fetch('/api/admin/generate-seo-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: blogPost.title, contentPreview })
      })
      const data = await resp.json()
      if (!resp.ok || !data.success) throw new Error(data.error || 'SEO fejl')
      setBlogPost(prev => ({ ...prev, meta_description: data.description }))
    } catch (e) {
      alert('Kunne ikke generere SEO beskrivelse')
    } finally {
      setGeneratingSeo(false)
    }
  }

  const suggestBlogTopics = async () => {
    const category = getCurrentCategory()
    if (!category) return

    try {
      setSuggestingTopics(true)
      setTopicSuggestionError('')

      const resp = await fetch('/api/admin/blogs/suggest-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: blogPost.category_id,
          postType: blogPost.post_type,
          limit: 8,
        })
      })

      const data = await resp.json()
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Kunne ikke foreslå emner')
      }

      setTopicSuggestions(Array.isArray(data.suggestions) ? data.suggestions : [])
      setSelectedTopicBrief(null)
      setSelectedTopicBriefTitle('')
    } catch (e) {
      setTopicSuggestionError(e instanceof Error ? e.message : 'Kunne ikke hente emneforslag')
    } finally {
      setSuggestingTopics(false)
    }
  }

  const applyTopicSuggestion = (suggestion: TopicSuggestion) => {
    const hasMeaningfulContent =
      Boolean(blogPost.title.trim()) ||
      blogPost.sections.some(section => (section.content || '').trim().length > 0 || (section.title || '').trim().length > 0)

    if (hasMeaningfulContent) {
      const confirmed = window.confirm('Dette vil overskrive titel, excerpt, SEO-felter, tags og sektionstruktur. Fortsæt?')
      if (!confirmed) return
    }

    setBlogPost(prev => ({
      ...prev,
      title: suggestion.title,
      slug: generateSlug(suggestion.title),
      excerpt: suggestion.suggestedExcerpt || prev.excerpt,
      meta_title: suggestion.suggestedMetaTitle || suggestion.title,
      meta_description: suggestion.suggestedMetaDescription || prev.meta_description,
      tags: Array.isArray(suggestion.suggestedTags) ? suggestion.suggestedTags : prev.tags,
      sections: scaffoldSectionsFromSuggestion(suggestion),
    }))
  }

  const generateBlogFromSuggestion = async (suggestion: TopicSuggestion, suggestionIndex: number) => {
    const hasMeaningfulContent =
      Boolean(blogPost.title.trim()) ||
      blogPost.sections.some(
        (section) =>
          (section.content || '').trim().length > 0 || (section.title || '').trim().length > 0
      )

    if (hasMeaningfulContent) {
      const confirmed = window.confirm(
        'Dette vil overskrive nuværende titel, SEO-felter, tags og sektioner med en AI-genereret blog. Fortsæt?'
      )
      if (!confirmed) return
    }

    try {
      setGeneratingStructuredPost(suggestionIndex)
      const resp = await fetch('/api/admin/blogs/generate-structured-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: blogPost.category_id,
          postType: blogPost.post_type,
          suggestion,
          brief: selectedTopicBriefTitle === suggestion.title ? selectedTopicBrief : null,
        }),
      })

      const data = await resp.json()
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Kunne ikke generere blog')
      }

      const post = data.post || {}
      const matchingBrief = selectedTopicBriefTitle === suggestion.title ? selectedTopicBrief : null
      setBlogPost((prev) => ({
        ...prev,
        title: post.title || suggestion.title,
        slug: matchingBrief?.recommendedSlug || generateSlug(post.title || suggestion.title),
        excerpt: post.excerpt || suggestion.suggestedExcerpt || '',
        meta_title: post.metaTitle || suggestion.suggestedMetaTitle || suggestion.title,
        meta_description:
          post.metaDescription || suggestion.suggestedMetaDescription || '',
        tags: Array.isArray(post.tags) ? post.tags : suggestion.suggestedTags || [],
        sections:
          Array.isArray(post.sections) && post.sections.length > 0
            ? post.sections
            : scaffoldSectionsFromSuggestion(suggestion),
      }))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Kunne ikke generere blog')
    } finally {
      setGeneratingStructuredPost(null)
    }
  }

  const generateBriefFromSuggestion = async (suggestion: TopicSuggestion, suggestionIndex: number) => {
    try {
      setGeneratingBrief(suggestionIndex)
      const resp = await fetch('/api/admin/blogs/generate-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: blogPost.category_id,
          postType: blogPost.post_type,
          suggestion,
        }),
      })

      const data = await resp.json()
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Kunne ikke generere brief')
      }

      setSelectedTopicBrief(data.brief || null)
      setSelectedTopicBriefTitle(suggestion.title)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Kunne ikke generere brief')
    } finally {
      setGeneratingBrief(null)
    }
  }

  const regenerateSectionFromBrief = async (sectionIndex: number) => {
    if (!selectedTopicBrief) {
      alert('Lav et brief først, før du regenererer en sektion.')
      return
    }

    if (!blogPost.title || !blogPost.category_id) {
      alert('Titel og kategori skal være udfyldt først')
      return
    }

    try {
      setRegeneratingSection(sectionIndex)

      const resp = await fetch('/api/admin/blogs/regenerate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: blogPost.category_id,
          postType: blogPost.post_type,
          blogTitle: blogPost.title,
          suggestion: topicSuggestions.find((item) => item.title === selectedTopicBriefTitle) || null,
          brief: selectedTopicBrief,
          targetSection: {
            section_type: blogPost.sections[sectionIndex].section_type,
            title: blogPost.sections[sectionIndex].title,
            content: blogPost.sections[sectionIndex].content,
            takeaway: blogPost.sections[sectionIndex].takeaway,
            section_order: blogPost.sections[sectionIndex].section_order,
          },
          allSections: blogPost.sections
            .filter((section) => section.section_type !== 'widget')
            .map((section) => ({
              section_type: section.section_type,
              title: section.title,
              content: section.content,
              takeaway: section.takeaway,
              section_order: section.section_order,
            })),
        }),
      })

      const data = await resp.json()
      if (!resp.ok || !data.success || !data.section) {
        throw new Error(data.error || 'Kunne ikke regenerere sektionen')
      }

      updateSection(sectionIndex, {
        title:
          blogPost.sections[sectionIndex].section_type === 'content'
            ? data.section.title || blogPost.sections[sectionIndex].title
            : blogPost.sections[sectionIndex].title,
        content: data.section.content || '',
        takeaway: data.section.takeaway || '',
      })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Kunne ikke regenerere sektionen')
    } finally {
      setRegeneratingSection(null)
    }
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

  const renderFormattingToolbar = (sectionIndex: number, content: string, extras?: ReactNode) => (
    <div className="flex flex-wrap items-center gap-2 mb-2">
      <span className="text-xs text-gray-500 shrink-0">Formatering:</span>
      <button
        type="button"
        title="Fed (**tekst**)"
        onClick={() =>
          insertMarkdownAroundSelection(sectionIndex, '**', '**', (v) => updateSection(sectionIndex, { content: v }), content)
        }
        className="px-2.5 py-1 text-xs font-bold bg-gray-100 text-gray-900 rounded border border-gray-200 hover:bg-gray-200"
      >
        Fed
      </button>
      <button
        type="button"
        title="Kursiv (*tekst*)"
        onClick={() =>
          insertMarkdownAroundSelection(sectionIndex, '*', '*', (v) => updateSection(sectionIndex, { content: v }), content)
        }
        className="px-2.5 py-1 text-xs italic bg-gray-100 text-gray-900 rounded border border-gray-200 hover:bg-gray-200"
      >
        Kursiv
      </button>
      {extras ? (
        <>
          <span className="text-gray-300 select-none" aria-hidden>
            |
          </span>
          {extras}
        </>
      ) : null}
    </div>
  )

  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  /** **fed** og *kursiv* (markdown-lignende); kører efter escape */
  const parseInlineMarkdown = (line: string) => {
    let t = escapeHtml(line)
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    t = t.replace(
      /\[([^\]]+)\]\((\/[^)\s]+)\)/g,
      '<a href="$2" class="text-blue-700 underline hover:text-blue-900">$1</a>'
    )
    return t
  }

  const formatContent = (text: string) => {
    if (!text) return ''

    const normalized = text.replace(/\r\n/g, '\n')
    const lines = normalized.split('\n')
    const htmlParts: string[] = []
    let inList = false
    let listItems: string[] = []
    let paragraphLines: string[] = []

    const flushParagraph = () => {
      if (paragraphLines.length > 0) {
        const content = paragraphLines.map((ln) => parseInlineMarkdown(ln)).join('<br/>')
        htmlParts.push(`<p>${content}</p>`)
        paragraphLines = []
      }
    }

    const flushList = () => {
      if (inList) {
        htmlParts.push(`<ul>${listItems.map(item => `<li>${item}</li>`).join('')}</ul>`)
        inList = false
        listItems = []
      }
    }

    for (const rawLine of lines) {
      const line = rawLine.trim()

      // Blank line: new paragraph or end list
      if (line === '') {
        flushList()
        flushParagraph()
        continue
      }

      // Markdown-style headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headingMatch) {
        flushList()
        flushParagraph()
        const level = Math.min(headingMatch[1].length, 6)
        const textContent = parseInlineMarkdown(headingMatch[2].trim())
        htmlParts.push(`<h${level}>${textContent}</h${level}>`)
        continue
      }

      // Bullet list items
      const bulletMatch = line.match(/^[-•]\s+(.+)$/)
      if (bulletMatch) {
        flushParagraph()
        inList = true
        listItems.push(parseInlineMarkdown(bulletMatch[1].trim()))
        continue
      }

      // Default: part of paragraph; preserve single line breaks as <br/>
      paragraphLines.push(line)
    }

    // Flush any remaining buffers
    flushList()
    flushParagraph()

    return htmlParts.join('')
  }

  const insertHeading = (sectionIndex: number, level: number = 1) => {
    const headingText = level === 1 ? 'Ny Overskrift' : level === 2 ? 'Underoverskrift' : 'Under-underoverskrift'
    const headingMarkup = `${'#'.repeat(level)} ${headingText}`
    
    const currentContent = blogPost.sections[sectionIndex].content
    const newContent = currentContent ? `${currentContent}\n\n${headingMarkup}\n\n` : `${headingMarkup}\n\n`
    
    updateSection(sectionIndex, { content: newContent })
  }

  const generateContentFromSections = () => {
    // Generate HTML content from sections for the main content field
    let content = ''
    
    blogPost.sections.forEach((section, index) => {
      if (section.section_type === 'introduction') {
        content += `<div class="blog-section content-section">
          <h2 id="heading-${index + 1}" class="section-heading">Indledning</h2>
          <div class="section-content">
            ${formatContent(section.content)}
            ${section.image_url ? `<img src="${section.image_url}" alt="" class="section-image" />` : ''}
            ${section.takeaway ? `<div class="takeaway-box"><strong>One takeaway:</strong> ${section.takeaway}</div>` : ''}
          </div>
        </div>`
      } else if (section.section_type === 'content') {
        content += `<div class="blog-section content-section">
          <h1 id="heading-${index + 1}" class="section-heading">${section.title || section.heading || `Sektion ${index}`}</h1>
          <div class="section-content">
            ${formatContent(section.content)}
            ${section.image_url ? `<img src="${section.image_url}" alt="" class="section-image" />` : ''}
            ${section.takeaway ? `<div class="takeaway-box"><strong>One takeaway:</strong> ${section.takeaway}</div>` : ''}
          </div>
        </div>`
      } else if (section.section_type === 'widget') {
        const widget = widgets.find(w => w.id === section.widget_id)
        const rawConfig = widget?.content || '{}'
        let safeConfig = '{}'
        try { safeConfig = JSON.stringify(JSON.parse(rawConfig as unknown as string)) } catch {}
        content += `<div class="blog-section widget-section">
          <div class="blog-widget" data-widget-id="${section.widget_id || ''}" data-widget-type="${widget?.widget_type || ''}" data-widget-config='${safeConfig}'></div>
        </div>`
      } else if (section.section_type === 'conclusion') {
        content += `<div class="blog-section conclusion-section">
          <h1 id="heading-${index + 1}" class="section-heading">Afslutning</h1>
          <div class="section-content">
            ${formatContent(section.content)}
            ${section.image_url ? `<img src="${section.image_url}" alt="" class="section-image" />` : ''}
            ${section.takeaway ? `<div class="takeaway-box"><strong>One takeaway:</strong> ${section.takeaway}</div>` : ''}
          </div>
        </div>`
      } else if (section.title === 'Resume') {
        content += `<div class="blog-section resume-section">
          <h1 id="heading-${index + 1}" class="section-heading">Resume</h1>
          <div class="section-content">
            ${formatContent(section.content)}
            ${section.takeaway ? `<div class="takeaway-box"><strong>One takeaway:</strong> ${section.takeaway}</div>` : ''}
          </div>
        </div>`
      }
    })
    
    return content || 'Indhold genereres fra sektioner...'
  }

  const generateSectionTakeaway = async (sectionIndex: number) => {
    try {
      setGeneratingTakeaway(sectionIndex)
      const section = blogPost.sections[sectionIndex]
      const resp = await fetch('/api/admin/generate-blog-takeaway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: blogPost.title, sectionText: section.content })
      })
      const data = await resp.json()
      if (!resp.ok || !data.success) throw new Error(data.error || 'API error')
      updateSection(sectionIndex, { takeaway: data.takeaway })
    } catch (e) {
      alert('Kunne ikke generere takeaway for denne sektion')
    } finally {
      setGeneratingTakeaway(null)
    }
  }

  const generateContentWithAI = async (sectionIndex: number) => {
    if (!blogPost.title || !blogPost.category_id) {
      alert('Titel og kategori skal være udfyldt før AI generering')
      return
    }

    setGeneratingContent(sectionIndex)
    
    try {
      // Get category name
      const category = categories.find(c => c.id === blogPost.category_id)
      const categoryName = category?.name || 'Keto'
      
      // Get existing content from all sections
      const existingContent = blogPost.sections
        .map((section, index) => {
          if (section.section_type === 'introduction') {
            return `Indledning: ${section.content}`
          } else if (section.section_type === 'content') {
            return `Sektion ${index}: ${section.heading || `Indholdsboks ${index}`} - ${section.content}`
          }
          return null
        })
        .filter(Boolean)
        .join('\n\n')

      const response = await fetch('/api/admin/generate-blog-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: blogPost.title,
          category: categoryName,
          existingContent: existingContent
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Fejl ved generering af indhold')
      }

      const data = await response.json()
      
      if (data.success && data.content) {
        // Update the specific section with generated content
        updateSection(sectionIndex, { 
          content: data.content,
          heading: data.heading || `Sektion ${sectionIndex}`
        })
      } else {
        throw new Error('Ingen indhold blev genereret')
      }
    } catch (error) {
      console.error('Error generating content:', error)
      alert(`Fejl ved generering af indhold: ${error instanceof Error ? error.message : 'Ukendt fejl'}`)
    } finally {
      setGeneratingContent(null)
    }
  }

  const generateResume = async () => {
    if (!blogPost.title || !blogPost.category_id) {
      alert('Titel og kategori skal være udfyldt før resume generering')
      return
    }

    setGeneratingResume(true)
    
    try {
      // Get category name
      const category = categories.find(c => c.id === blogPost.category_id)
      const categoryName = category?.name || 'Keto'
      
      // Get all content from sections
      const allContent = blogPost.sections
        .map((section, index) => {
          if (section.section_type === 'introduction') {
            return `Indledning: ${section.content}`
          } else if (section.section_type === 'content') {
            return `${section.title || `Sektion ${index}`}: ${section.content}`
          }
          return null
        })
        .filter(Boolean)
        .join('\n\n')

      const response = await fetch('/api/admin/generate-blog-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: blogPost.title,
          category: categoryName,
          content: allContent
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Fejl ved generering af resume')
      }

      const data = await response.json()
      
      if (data.success && data.resume) {
        // Add resume as a new content section
        const newSection = {
          section_type: 'content' as const,
          section_order: blogPost.sections.length + 1,
          title: 'Resume',
          content: data.resume
        }
        
        setBlogPost(prev => ({
          ...prev,
          sections: [...prev.sections, newSection]
        }))
      } else {
        throw new Error('Ingen resume blev genereret')
      }
    } catch (error) {
      console.error('Error generating resume:', error)
      alert(`Fejl ved generering af resume: ${error instanceof Error ? error.message : 'Ukendt fejl'}`)
    } finally {
      setGeneratingResume(false)
    }
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
      const sectionsToInsert = blogPost.sections.map(({ id: _omitId, ...section }) => ({
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
      <input
        ref={blogImageFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        aria-hidden
        onChange={handleBlogImageFileChange}
      />
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
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {blogPost.id ? 'Rediger Blog' : 'Ny Blog'}
                </h1>
                {currentUser && (
                  <p className="text-sm text-gray-500">
                    Forfatter: {currentUser.first_name || 'nicolaivarney'}
                  </p>
                )}
              </div>
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

              {/* Header Image */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Header-billede
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Upload eller indsæt URL. Vises øverst på artiklen (valgfrit).
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={blogPost.header_image_url || ''}
                    onChange={(e) =>
                      setBlogPost(prev => ({
                        ...prev,
                        header_image_url: e.target.value,
                      }))
                    }
                    className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://… (valgfrit hvis du uploader)"
                  />
                  <button
                    type="button"
                    onClick={openHeaderImagePicker}
                    disabled={uploadingBlogImage === 'header'}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 shrink-0"
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingBlogImage === 'header' ? 'Uploader…' : 'Upload billede'}
                  </button>
                </div>
                {blogPost.header_image_url ? (
                  <div className="mt-3">
                    <img
                      src={blogPost.header_image_url}
                      alt=""
                      className="max-h-40 w-full max-w-xl rounded-md border border-gray-200 object-cover bg-gray-50"
                    />
                  </div>
                ) : null}
              </div>
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
                    <div className="flex items-center justify-between mb-2 gap-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Indledningstekst
                      </label>
                      <button
                        type="button"
                        onClick={() => regenerateSectionFromBrief(index)}
                        disabled={!selectedTopicBrief || regeneratingSection === index}
                        className="inline-flex items-center px-3 py-1 bg-violet-600 text-white text-sm rounded-md hover:bg-violet-700 disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        {!selectedTopicBrief
                          ? 'Lav brief først'
                          : regeneratingSection === index
                            ? 'Regenererer...'
                            : '🤖 Regenerér fra brief'}
                      </button>
                    </div>
                    {renderFormattingToolbar(index, section.content)}
                    <textarea
                      ref={(el) => {
                        sectionTextareaRefs.current[index] = el
                      }}
                      value={section.content}
                      onChange={(e) => updateSection(index, { content: e.target.value })}
                      rows={10}
                      spellCheck
                      className="w-full min-h-[200px] px-3 py-2.5 border border-gray-300 rounded-md leading-normal focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans text-sm"
                      placeholder="Skriv en indledning… Brug **fed** og *kursiv*. Tom linje = nyt afsnit."
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

                    {/* One Takeaway */}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => generateSectionTakeaway(index)}
                        disabled={generatingTakeaway === index}
                        className="px-3 py-1.5 text-sm rounded-md bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 disabled:opacity-50"
                      >
                        {generatingTakeaway === index ? 'Genererer…' : '🤖 One takeaway'}
                      </button>
                      {section.takeaway && (
                        <div className="mt-2 p-3 rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-sm">
                          <strong className="mr-1">One takeaway:</strong>
                          {section.takeaway}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {section.section_type === 'content' && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Overskrift
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => regenerateSectionFromBrief(index)}
                            disabled={!selectedTopicBrief || regeneratingSection === index}
                            className="inline-flex items-center px-3 py-1 bg-violet-600 text-white text-sm rounded-md hover:bg-violet-700 disabled:opacity-50"
                          >
                            <Sparkles className="w-4 h-4 mr-1" />
                            {!selectedTopicBrief
                              ? 'Lav brief først'
                              : regeneratingSection === index
                                ? 'Regenererer...'
                                : '🤖 Fra brief'}
                          </button>
                          <button
                            onClick={() => generateContentWithAI(index)}
                            disabled={generatingContent === index}
                            className="inline-flex items-center px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Sparkles className="w-4 h-4 mr-1" />
                            {generatingContent === index ? 'Genererer...' : '🤖 AI Generer'}
                          </button>
                        </div>
                      </div>
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
                      {renderFormattingToolbar(
                        index,
                        section.content,
                        <>
                          <button
                            type="button"
                            onClick={() => insertHeading(index, 1)}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            H1
                          </button>
                          <button
                            type="button"
                            onClick={() => insertHeading(index, 2)}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            H2
                          </button>
                          <button
                            type="button"
                            onClick={() => insertHeading(index, 3)}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            H3
                          </button>
                        </>
                      )}
                      <textarea
                        ref={(el) => {
                          sectionTextareaRefs.current[index] = el
                        }}
                        value={section.content}
                        onChange={(e) => updateSection(index, { content: e.target.value })}
                        rows={8}
                        spellCheck
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans text-sm"
                        placeholder="Skriv indhold… Tom linje = nyt afsnit. # Overskrift, • punkt. **fed**, *kursiv*."
                      />
                    </div>
                    
                    {/* One Takeaway */}
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => generateSectionTakeaway(index)}
                        disabled={generatingTakeaway === index}
                        className="px-3 py-1.5 text-sm rounded-md bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 disabled:opacity-50"
                      >
                        {generatingTakeaway === index ? 'Genererer…' : '🤖 One takeaway'}
                      </button>
                      {section.takeaway && (
                        <div className="mt-2 p-3 rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-sm">
                          <strong className="mr-1">One takeaway:</strong>
                          {section.takeaway}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Billede
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Upload fra computer eller indsæt et direkte link til et billede.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="url"
                          value={section.image_url || ''}
                          onChange={(e) => updateSection(index, { image_url: e.target.value })}
                          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://… (valgfrit hvis du uploader)"
                        />
                        <button
                          type="button"
                          onClick={() => openSectionImagePicker(index)}
                          disabled={uploadingBlogImage === index}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 shrink-0"
                        >
                          <Upload className="h-4 w-4" />
                          {uploadingBlogImage === index ? 'Uploader…' : 'Upload billede'}
                        </button>
                      </div>
                      {section.image_url ? (
                        <div className="mt-3">
                          <img
                            src={section.image_url}
                            alt=""
                            className="max-h-48 max-w-full rounded-md border border-gray-200 object-contain bg-gray-50"
                          />
                        </div>
                      ) : null}
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
                    <div className="flex items-center justify-between mb-2 gap-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Afslutningstekst
                      </label>
                      <button
                        type="button"
                        onClick={() => regenerateSectionFromBrief(index)}
                        disabled={!selectedTopicBrief || regeneratingSection === index}
                        className="inline-flex items-center px-3 py-1 bg-violet-600 text-white text-sm rounded-md hover:bg-violet-700 disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        {!selectedTopicBrief
                          ? 'Lav brief først'
                          : regeneratingSection === index
                            ? 'Regenererer...'
                            : '🤖 Regenerér fra brief'}
                      </button>
                    </div>
                    {renderFormattingToolbar(index, section.content)}
                    <textarea
                      ref={(el) => {
                        sectionTextareaRefs.current[index] = el
                      }}
                      value={section.content}
                      onChange={(e) => updateSection(index, { content: e.target.value })}
                      rows={6}
                      spellCheck
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans text-sm"
                      placeholder="Afslutning… **fed**, *kursiv*. Tom linje = nyt afsnit."
                    />

                    {/* One Takeaway */}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => generateSectionTakeaway(index)}
                        disabled={generatingTakeaway === index}
                        className="px-3 py-1.5 text-sm rounded-md bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 disabled:opacity-50"
                      >
                        {generatingTakeaway === index ? 'Genererer…' : '🤖 One takeaway'}
                      </button>
                      {section.takeaway && (
                        <div className="mt-2 p-3 rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-sm">
                          <strong className="mr-1">One takeaway:</strong>
                          {section.takeaway}
                        </div>
                      )}
                    </div>
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
                
                <button
                  onClick={generateResume}
                  disabled={generatingResume}
                  className="flex items-center px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {generatingResume ? 'Genererer...' : '📋 Resume'}
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

            {/* SEO Topic Suggestions */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">SEO Emneforslag</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    AI finder content gaps ud fra eksisterende blogtitler i kategorien.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={suggestBlogTopics}
                  disabled={suggestingTopics}
                  className="inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700 disabled:opacity-50 shrink-0"
                >
                  {suggestingTopics ? 'Finder…' : '✨ Foreslå emner'}
                </button>
              </div>

              <div className="text-xs text-gray-500 mb-4">
                Kategori: <span className="font-medium text-gray-700">{getCurrentCategory()?.name || 'Ikke valgt'}</span>
                {' '}• Post type: <span className="font-medium text-gray-700">{blogPost.post_type === 'core' ? 'Kerneartikel' : 'Blog'}</span>
              </div>

              {topicSuggestionError && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {topicSuggestionError}
                </div>
              )}

              {selectedTopicBrief && (
                <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">SEO Brief</p>
                      <h4 className="mt-1 text-base font-semibold text-gray-900">{selectedTopicBrief.recommendedTitle || selectedTopicBriefTitle}</h4>
                      <p className="mt-1 text-sm text-gray-600">{selectedTopicBrief.readerPromise}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTopicBrief(null)
                        setSelectedTopicBriefTitle('')
                      }}
                      className="text-sm text-violet-700 hover:text-violet-900"
                    >
                      Luk
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
                    <div className="rounded-md bg-white/70 p-3">
                      <p className="font-medium text-gray-900">Søgeintention</p>
                      <p className="mt-1 text-gray-700">{selectedTopicBrief.searchIntent}</p>
                    </div>
                    <div className="rounded-md bg-white/70 p-3">
                      <p className="font-medium text-gray-900">Primært keyword</p>
                      <p className="mt-1 text-gray-700">{selectedTopicBrief.primaryKeyword}</p>
                    </div>
                    <div className="rounded-md bg-white/70 p-3 md:col-span-2">
                      <p className="font-medium text-gray-900">Vinkel</p>
                      <p className="mt-1 text-gray-700">{selectedTopicBrief.angle}</p>
                    </div>
                    <div className="rounded-md bg-white/70 p-3">
                      <p className="font-medium text-gray-900">Meta title</p>
                      <p className="mt-1 text-gray-700">{selectedTopicBrief.metaTitle}</p>
                    </div>
                    <div className="rounded-md bg-white/70 p-3">
                      <p className="font-medium text-gray-900">Meta description</p>
                      <p className="mt-1 text-gray-700">{selectedTopicBrief.metaDescription}</p>
                    </div>
                  </div>

                  {selectedTopicBrief.secondaryKeywords?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-900 mb-2">Sekundære keywords</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTopicBrief.secondaryKeywords.map((keyword, keywordIndex) => (
                          <span
                            key={`${keyword}-${keywordIndex}`}
                            className="rounded-full bg-white px-2.5 py-1 text-xs text-violet-700 border border-violet-200"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTopicBrief.sectionPlan?.length > 0 && (
                    <div className="mt-3 rounded-md bg-white/70 p-3">
                      <p className="text-sm font-medium text-gray-900 mb-2">Sektionplan</p>
                      <div className="space-y-1 text-sm text-gray-700">
                        {selectedTopicBrief.sectionPlan.map((item, sectionIndex) => (
                          <p key={`${item}-${sectionIndex}`}>{sectionIndex + 1}. {item}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTopicBrief.internalLinks?.length > 0 && (
                    <div className="mt-3 rounded-md bg-white/70 p-3">
                      <p className="text-sm font-medium text-gray-900 mb-2">Foreslåede interne links</p>
                      <div className="space-y-2">
                        {selectedTopicBrief.internalLinks.map((link, linkIndex) => (
                          <div key={`${link.slug}-${linkIndex}`} className="rounded border border-violet-100 bg-white px-3 py-2">
                            <p className="text-sm font-medium text-gray-900">{link.title}</p>
                            <p className="text-xs text-violet-700">/{link.slug}</p>
                            <p className="mt-1 text-sm text-gray-600">{link.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTopicBrief.notes?.length > 0 && (
                    <div className="mt-3 rounded-md bg-white/70 p-3">
                      <p className="text-sm font-medium text-gray-900 mb-2">Redaktionelle noter</p>
                      <div className="space-y-1 text-sm text-gray-700">
                        {selectedTopicBrief.notes.map((note, noteIndex) => (
                          <p key={`${note}-${noteIndex}`}>- {note}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {topicSuggestions.length > 0 ? (
                <div className="space-y-3">
                  {topicSuggestions.map((suggestion, index) => (
                    <div
                      key={`${suggestion.title}-${index}`}
                      className={`rounded-lg p-4 border ${
                        selectedTopicBriefTitle === suggestion.title && selectedTopicBrief
                          ? 'border-violet-300 bg-violet-50/40'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                              {suggestion.primaryKeyword}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                              {suggestion.searchIntent}
                            </span>
                            <span className={`px-2 py-0.5 rounded ${
                              suggestion.priority === 'high'
                                ? 'bg-green-50 text-green-700'
                                : suggestion.priority === 'medium'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-gray-100 text-gray-700'
                            }`}>
                              {suggestion.priority}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => generateBriefFromSuggestion(suggestion, index)}
                            disabled={generatingBrief === index}
                            className="px-3 py-1.5 bg-violet-600 text-white text-sm rounded-md hover:bg-violet-700 disabled:opacity-50"
                          >
                            {generatingBrief === index ? 'Laver brief…' : 'Lav brief'}
                          </button>
                          <button
                            type="button"
                            onClick={() => applyTopicSuggestion(suggestion)}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                          >
                            Brug emne
                          </button>
                          <button
                            type="button"
                            onClick={() => generateBlogFromSuggestion(suggestion, index)}
                            disabled={generatingStructuredPost === index}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {generatingStructuredPost === index
                              ? 'Genererer…'
                              : selectedTopicBriefTitle === suggestion.title && selectedTopicBrief
                                ? 'Generér fra brief'
                                : 'Generér blog'}
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2 text-sm text-gray-600">
                        <p><span className="font-medium text-gray-800">Hvorfor nu:</span> {suggestion.whyNow}</p>
                        <p><span className="font-medium text-gray-800">Gap:</span> {suggestion.gapReason}</p>
                        <p><span className="font-medium text-gray-800">Vinkel:</span> {suggestion.suggestedAngle}</p>
                        {Array.isArray(suggestion.suggestedOutline) && suggestion.suggestedOutline.length > 0 && (
                          <div>
                            <p className="font-medium text-gray-800 mb-1">Foreslået struktur:</p>
                            <ul className="list-disc pl-5 space-y-1">
                              {suggestion.suggestedOutline.slice(0, 5).map((item, outlineIndex) => (
                                <li key={`${suggestion.title}-outline-${outlineIndex}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg p-4">
                  Klik på <span className="font-medium">Foreslå emner</span> for at få AI-idéer til næste blog i denne kategori.
                </div>
              )}
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
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={generateSeoDescription}
                      disabled={generatingSeo}
                      className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {generatingSeo ? 'Genererer…' : '🤖 AI: Generer SEO'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="w-full px-2 py-2 border border-gray-300 rounded-md flex flex-wrap gap-2">
                    {blogPost.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        {tag}
                        <button type="button" className="ml-2 text-blue-700 hover:text-blue-900" onClick={() => removeTag(tag)}>×</button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      className="flex-1 min-w-[160px] outline-none"
                      placeholder="Skriv tag og tryk Enter eller Komma"
                    />
                  </div>
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
