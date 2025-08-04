'use client'

import { useState } from 'react'
import { MessageCircle, Reply, Heart, Flag, Send, User } from 'lucide-react'

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
}

export default function CommentSystem({ recipeSlug }: CommentSystemProps) {
  const [comments, setComments] = useState<Comment[]>([
    {
      id: '1',
      author: 'Sarah Jensen',
      content: 'Fantastisk opskrift! Jeg tilføjede lidt ekstra chili og det blev perfekt. Kan varmt anbefales! 🌶️',
      timestamp: '2024-01-15T10:30:00Z',
      likes: 12,
      replies: [
        {
          id: '1-1',
          author: 'Mads Hansen',
          content: 'Hvor meget ekstra chili tilføjede du? Jeg er lidt forsigtig med stærk mad 😅',
          timestamp: '2024-01-15T11:15:00Z',
          likes: 3,
          replies: []
        }
      ]
    },
    {
      id: '2',
      author: 'Emma Nielsen',
      content: 'Prøvede denne i går og hele familien elskede den! Specielt børnene var vilde med smagen. Tak for opskriften! 👨‍👩‍👧‍👦',
      timestamp: '2024-01-14T18:45:00Z',
      likes: 8,
      replies: []
    },
    {
      id: '3',
      author: 'Peter Madsen',
      content: 'Er der nogen der har prøvet at erstatte bacon med vegetarisk bacon? Jeg er vegetar og vil gerne prøve denne opskrift.',
      timestamp: '2024-01-14T16:20:00Z',
      likes: 5,
      replies: [
        {
          id: '3-1',
          author: 'Lisa Andersen',
          content: 'Ja! Jeg bruger altid Naturli\'s bacon og det fungerer super godt i denne opskrift. Smagen er næsten identisk!',
          timestamp: '2024-01-14T17:30:00Z',
          likes: 7,
          replies: []
        },
        {
          id: '3-2',
          author: 'Ole Christensen',
          content: 'Jeg har prøvet med tempeh bacon og det gav en rigtig god umami smag. Kan anbefales!',
          timestamp: '2024-01-14T19:10:00Z',
          likes: 4,
          replies: []
        }
      ]
    }
  ])

  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Lige nu'
    if (diffInHours < 24) return `For ${diffInHours} timer siden`
    if (diffInHours < 48) return 'I går'
    return date.toLocaleDateString('da-DK')
  }

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

  const handleSubmitComment = () => {
    if (!newComment.trim()) return

    const comment: Comment = {
      id: Date.now().toString(),
      author: 'Du',
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
      id: `${parentId}-${Date.now()}`,
      author: 'Du',
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

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
      <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-100">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <User size={16} className="text-green-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="font-medium text-gray-900">{comment.author}</span>
              <span className="text-sm text-gray-500">{formatTimestamp(comment.timestamp)}</span>
            </div>
            <p className="text-gray-700 mb-3">{comment.content}</p>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleLike(comment.id)}
                className={`flex items-center space-x-1 text-sm transition-colors ${
                  comment.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                }`}
              >
                <Heart size={14} className={comment.isLiked ? 'fill-current' : ''} />
                <span>{comment.likes}</span>
              </button>
              <button
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Reply size={14} />
                <span>Svar</span>
              </button>
              <button className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                <Flag size={14} />
                <span>Rapporter</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {replyingTo === comment.id && (
        <div className="ml-8 mb-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Skriv dit svar..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button
              onClick={() => handleSubmitReply(comment.id)}
              disabled={!replyContent.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {comment.replies.map(reply => renderComment(reply, true))}
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Kommentarer</h2>
        <p className="text-gray-600">Del dine erfaringer og tips med andre madentusiaster</p>
      </div>

      {/* Comment Form */}
      <div className="bg-white rounded-lg p-6 mb-8 shadow-sm border border-gray-100">
        <div className="flex space-x-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <User size={20} className="text-green-600" />
          </div>
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Skriv en kommentar..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              rows={3}
            />
            <div className="flex justify-between items-center mt-3">
              <p className="text-sm text-gray-500">
                Din kommentar vil blive synlig for alle
              </p>
              <button
                onClick={handleSubmitComment}
                disabled={!newComment.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send kommentar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map(comment => renderComment(comment))}
      </div>

      {comments.length === 0 && (
        <div className="text-center py-12">
          <MessageCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen kommentarer endnu</h3>
          <p className="text-gray-600">Vær den første til at dele dine erfaringer!</p>
        </div>
      )}
    </div>
  )
} 