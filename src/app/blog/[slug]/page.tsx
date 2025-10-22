'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { ArrowLeft, Calendar, User, Tag, ExternalLink, CheckCircle } from 'lucide-react'

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
  category: {
    id: number
    name: string
    slug: string
    color: string
  }
  post_type: 'core' | 'blog'
  is_evidence_based: boolean
  disclaimer_text: string
  breadcrumb_path: string[]
}

export default function BlogPostPage() {
  const params = useParams()
  const slug = params.slug as string
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createSupabaseClient()

  useEffect(() => {
    if (slug) {
      loadBlogPost()
    }
  }, [slug])

  const loadBlogPost = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          category:blog_categories(*)
        `)
        .eq('slug', slug)
        .eq('status', 'published')
        .single()

      if (error) {
        console.error('Error loading blog post:', error)
        setError('Blog post ikke fundet')
        return
      }

      if (data) {
        setPost(data)
        // Increment view count
        await supabase
          .from('blog_posts')
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq('id', data.id)
      } else {
        setError('Blog post ikke fundet')
      }
    } catch (error) {
      console.error('Error loading blog post:', error)
      setError('Fejl ved indlæsning af blog post')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('da-DK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Indlæser blog post...</p>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-8">Blog post ikke fundet</p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Gå tilbage til forsiden
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            {post.breadcrumb_path.map((item, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && <span className="mx-2">›</span>}
                <span className="hover:text-blue-600 cursor-pointer">{item}</span>
              </div>
            ))}
          </nav>

          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>

          {/* Meta info */}
          <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDate(post.published_at)}
            </div>
            <div className="flex items-center">
              <User className="w-4 h-4 mr-1" />
              {post.category.name}
            </div>
            {post.view_count > 0 && (
              <div className="flex items-center">
                <ExternalLink className="w-4 h-4 mr-1" />
                {post.view_count} visninger
              </div>
            )}
          </div>

          {/* Evidence-based badge */}
          {post.is_evidence_based && (
            <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full mb-4">
              <CheckCircle className="w-4 h-4 mr-1" />
              Evidensbaseret
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded"
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Excerpt */}
          {post.excerpt && (
            <div className="text-lg text-gray-700 mb-8 p-4 bg-gray-50 rounded-lg">
              {post.excerpt}
            </div>
          )}

          {/* Content */}
          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Disclaimer */}
          {post.is_evidence_based && post.disclaimer_text && (
            <div className="mt-8 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
              <p className="text-sm text-blue-800">
                <strong>Disclaimer:</strong> {post.disclaimer_text}
              </p>
            </div>
          )}

          {/* Reddit integration */}
          {post.reddit_post_id && post.reddit_subreddit && (
            <div className="mt-8 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h3 className="text-lg font-semibold text-orange-800 mb-2">
                Diskussion på Reddit
              </h3>
              <p className="text-orange-700 mb-3">
                Dette indlæg er også diskuteret i r/{post.reddit_subreddit}
              </p>
              <a
                href={`https://reddit.com/r/${post.reddit_subreddit}/comments/${post.reddit_post_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Se diskussion på Reddit
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
