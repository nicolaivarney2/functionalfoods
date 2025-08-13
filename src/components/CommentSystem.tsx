'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Reply, Heart, Flag, Send, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import CommentCTA from './CommentCTA'
import LoginModal from './LoginModal'

interface Comment {
  id: string
  author: string
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
  const { user } = useAuth()
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')

  // Update comment count when comments change
  useEffect(() => {
    const totalComments = comments.length + comments.reduce((total, comment) => total + comment.replies.length, 0)
    onCommentUpdate?.(totalComments)
  }, [comments, onCommentUpdate])

  const handleLike = (commentId: string) => {
    setComments(prev => 
      prev.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
            isLiked: !comment.isLiked
          }
        }
        return comment
      })
    )
  }

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    const comment: Comment = {
      id: Date.now().toString(),
      author: user?.user_metadata?.name || 'Anonym',
      content: newComment,
      timestamp: new Date().toISOString(),
      likes: 0,
      replies: []
    }

    setComments(prev => [comment, ...prev])
    setNewComment('')
  }

  const handleSubmitReply = (parentId: string) => {
    if (!replyContent.trim()) return

    const reply: Comment = {
      id: `${parentId}.${Date.now()}`,
      author: user?.user_metadata?.name || 'Anonym',
      content: replyContent,
      timestamp: new Date().toISOString(),
      likes: 0,
      replies: []
    }

    setComments(prev => 
      prev.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...comment.replies, reply]
          }
        }
        return comment
      })
    )

    setReplyContent('')
    setReplyingTo(null)
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
          <p className="text-gray-700 mb-3">{comment.content}</p>
          
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
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
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
                  onClick={() => setReplyingTo(null)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuller
                </button>
                <button
                  onClick={() => handleSubmitReply(comment.id)}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Svar
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
                      <p className="text-gray-700 text-sm mb-2">{reply.content}</p>
                      
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

      {/* Show CTA if user is not logged in */}
      {!user && (
        <div className="mb-8">
          <CommentCTA onLoginClick={() => setIsLoginModalOpen(true)} />
        </div>
      )}

      {/* Comment Form - Only show if user is logged in */}
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
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Send size={16} />
                <span>Send kommentar</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length > 0 ? (
          comments.map(comment => renderComment(comment))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Ingen kommentarer endnu. Vær den første til at dele dine erfaringer!</p>
          </div>
        )}
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  )
} 