'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageCircle, Reply, Heart, Flag, Send, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import CommentCTA from './CommentCTA'
import LoginModal from './LoginModal'

interface Comment {
  id: string
  author: string
  authorId: string
  content: string
  timestamp: string
  likes: number
  replies: Comment[]
  isLiked?: boolean
}

interface CommentSystemProps {
  recipeSlug: string
  onCommentUpdate?: (count: number) => void
}

export default function CommentSystem({ recipeSlug, onCommentUpdate }: CommentSystemProps) {
  const { user, session } = useAuth()
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onCommentUpdateRef = useRef(onCommentUpdate)

  useEffect(() => {
    onCommentUpdateRef.current = onCommentUpdate
  }, [onCommentUpdate])

  // Hold optællingen synkroniseret uden at trigge ekstra renders fra parent.
  useEffect(() => {
    const totalComments =
      comments.length + comments.reduce((total, c) => total + c.replies.length, 0)
    onCommentUpdateRef.current?.(totalComments)
  }, [comments])

  const buildAuthHeaders = useCallback((): HeadersInit => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
    return headers
  }, [session?.access_token])

  // Hent kommentarer ved load (og igen når brugeren logger ind/ud, så isLiked er korrekt).
  useEffect(() => {
    let cancelled = false
    const fetchComments = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(
          `/api/recipes/${encodeURIComponent(recipeSlug)}/comments`,
          {
            headers: session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : undefined,
            cache: 'no-store',
          }
        )
        if (!res.ok) throw new Error('Kunne ikke hente kommentarer')
        const data = (await res.json()) as { comments: Comment[] }
        if (!cancelled) {
          setComments(data.comments ?? [])
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          console.error('fetch comments failed', e)
          setError('Kunne ikke indlæse kommentarer')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchComments()
    return () => {
      cancelled = true
    }
  }, [recipeSlug, session?.access_token])

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return
    if (!user) {
      setIsLoginModalOpen(true)
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/recipes/${encodeURIComponent(recipeSlug)}/comments`,
        {
          method: 'POST',
          headers: buildAuthHeaders(),
          body: JSON.stringify({ content: newComment.trim() }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Kunne ikke gemme kommentar')
      }
      const created = data.comment as Comment
      setComments((prev) => [created, ...prev])
      setNewComment('')
    } catch (e) {
      console.error('submit comment failed', e)
      setError(e instanceof Error ? e.message : 'Kunne ikke gemme kommentar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim() || isSubmitting) return
    if (!user) {
      setIsLoginModalOpen(true)
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/recipes/${encodeURIComponent(recipeSlug)}/comments`,
        {
          method: 'POST',
          headers: buildAuthHeaders(),
          body: JSON.stringify({ content: replyContent.trim(), parentId }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Kunne ikke gemme svar')
      }
      const created = data.comment as Comment
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId ? { ...c, replies: [...c.replies, created] } : c
        )
      )
      setReplyContent('')
      setReplyingTo(null)
    } catch (e) {
      console.error('submit reply failed', e)
      setError(e instanceof Error ? e.message : 'Kunne ikke gemme svar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLike = async (commentId: string) => {
    if (!user) {
      setIsLoginModalOpen(true)
      return
    }

    // Optimistisk opdatering i både topniveau og replies.
    const applyToggle = (c: Comment): Comment => {
      if (c.id === commentId) {
        const wasLiked = !!c.isLiked
        return {
          ...c,
          isLiked: !wasLiked,
          likes: Math.max(0, c.likes + (wasLiked ? -1 : 1)),
        }
      }
      if (c.replies.length > 0) {
        return { ...c, replies: c.replies.map(applyToggle) }
      }
      return c
    }
    setComments((prev) => prev.map(applyToggle))

    try {
      const res = await fetch(
        `/api/recipes/${encodeURIComponent(recipeSlug)}/comments/${commentId}/like`,
        { method: 'POST', headers: buildAuthHeaders() }
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Like fejlede')
      }
      // Synk korrekt antal fra serveren (i tilfælde af samtidige likes).
      const applyServer = (c: Comment): Comment => {
        if (c.id === commentId) {
          return { ...c, isLiked: !!data.liked, likes: typeof data.likes === 'number' ? data.likes : c.likes }
        }
        if (c.replies.length > 0) {
          return { ...c, replies: c.replies.map(applyServer) }
        }
        return c
      }
      setComments((prev) => prev.map(applyServer))
    } catch (e) {
      console.error('like failed', e)
      // Rul den optimistiske ændring tilbage.
      setComments((prev) => prev.map(applyToggle))
      setError(e instanceof Error ? e.message : 'Like fejlede')
    }
  }

  const renderComment = (comment: Comment) => (
    <div key={comment.id} className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <User size={16} className="text-green-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="font-medium text-gray-900">{comment.author}</span>
            <span className="text-sm text-gray-500">
              {new Date(comment.timestamp).toLocaleDateString('da-DK')}
            </span>
          </div>
          <p className="text-gray-700 mb-3 whitespace-pre-wrap">{comment.content}</p>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleLike(comment.id)}
              className={`flex items-center space-x-1 text-sm transition-colors ${
                comment.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <Heart size={16} className={comment.isLiked ? 'fill-current' : ''} />
              <span>{comment.likes}</span>
            </button>
            
            <button
              onClick={() => {
                if (!user) {
                  setIsLoginModalOpen(true)
                  return
                }
                setReplyingTo(replyingTo === comment.id ? null : comment.id)
              }}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-blue-500 transition-colors"
            >
              <Reply size={16} />
              <span>Svar</span>
            </button>
            
            <button className="flex items-center space-x-1 text-sm text-gray-500 hover:text-orange-500 transition-colors">
              <Flag size={16} />
              <span>Rapporter</span>
            </button>
          </div>

          {replyingTo === comment.id && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Skriv dit svar..."
                className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={3}
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  onClick={() => {
                    setReplyingTo(null)
                    setReplyContent('')
                  }}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuller
                </button>
                <button
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={isSubmitting || !replyContent.trim()}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sender…' : 'Svar'}
                </button>
              </div>
            </div>
          )}

          {comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map(reply => (
                <div key={reply.id} className="ml-6 pl-4 border-l-2 border-gray-200">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <User size={12} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm">{reply.author}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(reply.timestamp).toLocaleDateString('da-DK')}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm mb-2 whitespace-pre-wrap">{reply.content}</p>
                      
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleLike(reply.id)}
                          className={`flex items-center space-x-1 text-xs transition-colors ${
                            reply.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                          }`}
                        >
                          <Heart size={12} className={reply.isLiked ? 'fill-current' : ''} />
                          <span>{reply.likes}</span>
                        </button>
                        
                        <button className="flex items-center space-x-1 text-xs text-gray-500 hover:text-orange-500 transition-colors">
                          <Flag size={12} />
                          <span>Rapporter</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Kommentarer</h2>
        <p className="text-gray-600">Del dine erfaringer og tips med andre madentusiaster</p>
      </div>

      {!user && (
        <div className="mb-8">
          <CommentCTA onLoginClick={() => setIsLoginModalOpen(true)} />
        </div>
      )}

      {user && (
        <div className="bg-white rounded-lg p-6 mb-8 shadow-sm border border-gray-100">
          <form onSubmit={handleSubmitComment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Din kommentar
              </label>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Del dine erfaringer med denne opskrift..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={4}
                required
                maxLength={5000}
              />
            </div>
            <div className="flex items-center justify-between">
              {error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : (
                <span />
              )}
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Send size={16} />
                <span>{isSubmitting ? 'Sender…' : 'Send kommentar'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <p>Indlæser kommentarer…</p>
          </div>
        ) : comments.length > 0 ? (
          comments.map(comment => renderComment(comment))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Ingen kommentarer endnu. Vær den første til at dele dine erfaringer!</p>
          </div>
        )}
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  )
} 
