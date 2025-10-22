'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { ArrowLeft, Calendar, User, ExternalLink, CheckCircle, Info } from 'lucide-react'

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
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false)

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

  // Generate table of contents from content
  const generateTableOfContents = () => {
    if (!post?.content) return []
    
    const headings = post.content.match(/<h[2-6][^>]*>(.*?)<\/h[2-6]>/gi) || []
    return headings.map((heading, index) => {
      const text = heading.replace(/<[^>]*>/g, '').trim()
      return {
        text,
        id: `heading-${index + 1}`,
        level: parseInt(heading.match(/<h([2-6])/)?.[1] || '2')
      }
    })
  }

  const tableOfContents = generateTableOfContents()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#FAF9FD] shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left side - Content */}
            <div>
              {/* Breadcrumb */}
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                {(post.breadcrumb_path || ['Keto', 'Blogs']).map((item, index) => (
                  <div key={index} className="flex items-center">
                    {index > 0 && <span className="mx-2">›</span>}
                    <span className="hover:text-blue-600 cursor-pointer">{item}</span>
                  </div>
                ))}
              </nav>

              {/* Evidence-based badge */}
              {post.is_evidence_based && (
                <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full mb-4">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Evidensbaseret
                </div>
              )}

              {/* Title */}
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>

              {/* Meta info */}
              <div className="text-sm text-gray-600 mb-4">
                <p>Skrevet af nicolaivarney den {formatDate(post.published_at)}</p>
                {post.view_count > 0 && (
                  <p className="mt-1">{post.view_count} visninger</p>
                )}
              </div>

              {/* Disclaimer link */}
              <button
                onClick={() => setShowDisclaimerModal(true)}
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <Info className="w-4 h-4 mr-1" />
                Disclaimer
              </button>
            </div>

            {/* Right side - Image placeholder */}
            <div className="hidden lg:block">
              <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">Blog billede</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Table of Contents */}
          {tableOfContents.length > 0 && (
            <div className="lg:col-span-1">
              <div className="sticky top-8 bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Indholdsfortegnelse</h3>
                <nav className="space-y-2">
                  {tableOfContents.map((item, index) => (
                    <a
                      key={index}
                      href={`#${item.id}`}
                      className={`block text-sm text-gray-600 hover:text-blue-600 ${
                        item.level === 3 ? 'ml-4' : item.level === 4 ? 'ml-8' : ''
                      }`}
                    >
                      {item.text}
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className={`${tableOfContents.length > 0 ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
            <div className="bg-white rounded-lg shadow-sm p-8">
              {/* Content */}
              <div 
                className="blog-content"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </div>
          </div>
        </div>

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

        {/* Related content */}
        <div className="mt-12 bg-white rounded-lg shadow-sm p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Relateret indhold</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Keto Recipes */}
            <div className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="w-full h-32 bg-green-100 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-green-600 font-semibold">Keto Opskrifter</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Keto Opskrifter</h4>
              <p className="text-sm text-gray-600 mb-3">Lækre og nemme keto-venlige opskrifter til hverdag og fest</p>
              <a href="/keto/opskrifter" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                Se alle opskrifter →
              </a>
            </div>

            {/* Weight Loss */}
            <div className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="w-full h-32 bg-blue-100 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-blue-600 font-semibold">Vægttab</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Vægttab med Keto</h4>
              <p className="text-sm text-gray-600 mb-3">Evidensbaseret guide til vægttab med ketogen diæt</p>
              <a href="/keto/vægttab" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                Læs mere →
              </a>
            </div>

            {/* More Articles */}
            <div className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="w-full h-32 bg-purple-100 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-purple-600 font-semibold">Flere Artikler</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Flere Keto Artikler</h4>
              <p className="text-sm text-gray-600 mb-3">Udforsk vores komplette samling af keto-relaterede artikler</p>
              <a href="/keto" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                Se alle artikler →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer Modal */}
      {showDisclaimerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Disclaimer</h3>
            <p className="text-gray-700 mb-6">
              Indholdet på FunctionalFoods.dk er udelukkende tiltænkt uddannelses- og informationsformål. Det må ikke betragtes som medicinsk rådgivning eller erstatning for professionel vejledning, diagnose eller behandling. Kontakt altid en læge eller autoriseret sundhedspersonale ved spørgsmål om din helbredstilstand.
            </p>
            <button
              onClick={() => setShowDisclaimerModal(false)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              Luk
            </button>
          </div>
        </div>
      )}

      {/* Custom CSS for blog sections */}
      <style jsx global>{`
        .blog-content .blog-section {
          margin-bottom: 2rem !important;
          padding: 1.5rem !important;
          background: white !important;
          border-radius: 0.5rem !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
          display: block !important;
        }
        
        .blog-content .section-heading {
          font-size: 1.5rem !important;
          font-weight: 600 !important;
          color: #1f2937 !important;
          margin-bottom: 0.75rem !important;
          display: block !important;
        }
        
        .blog-content .section-content {
          line-height: 1.7 !important;
          color: #374151 !important;
          display: block !important;
        }
        
        .blog-content .section-content p {
          margin-bottom: 1rem !important;
        }
        
        .blog-content .section-content ul {
          margin: 1rem 0 !important;
          padding-left: 1.5rem !important;
        }
        
        .blog-content .section-content li {
          margin-bottom: 0.5rem !important;
          list-style-type: disc !important;
        }
        
        .blog-content .section-content img.section-image {
          width: 100% !important;
          height: auto !important;
          margin-top: 1rem !important;
          border-radius: 0.5rem !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08) !important;
        }
        
        .blog-content .section-content h3 {
          font-size: 1.25rem !important;
          font-weight: 600 !important;
          color: #1f2937 !important;
          margin: 1.5rem 0 1rem 0 !important;
        }
        
        .blog-content .section-content h4 {
          font-size: 1.1rem !important;
          font-weight: 600 !important;
          color: #374151 !important;
          margin: 1rem 0 0.5rem 0 !important;
        }
        
        .blog-content .widget-placeholder {
          background: #f3f4f6 !important;
          border: 2px dashed #d1d5db !important;
          padding: 2rem !important;
          text-align: center !important;
          color: #6b7280 !important;
          border-radius: 0.5rem !important;
          display: block !important;
        }
        
        .blog-content .introduction-section {
          background: white !important;
          border-left: 4px solid #3b82f6 !important;
        }
        
        .blog-content .conclusion-section {
          background: #f0fdf4 !important;
          border-left: 4px solid #10b981 !important;
        }
      `}</style>
    </div>
  )
}
