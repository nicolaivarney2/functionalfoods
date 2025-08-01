'use client'

import { useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'

interface Comment {
  id: string
  author: string
  content: string
  date: string
  rating: number
}

interface CommentSystemProps {
  recipeId: string
  comments: Comment[]
}

export default function CommentSystem({ recipeId, comments }: CommentSystemProps) {
  const [newComment, setNewComment] = useState('')
  const [rating, setRating] = useState(5)
  const [localComments, setLocalComments] = useState(comments)

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    const comment: Comment = {
      id: Date.now().toString(),
      author: 'Anonym',
      content: newComment,
      date: new Date().toLocaleDateString('da-DK'),
      rating
    }

    setLocalComments([comment, ...localComments])
    setNewComment('')
    setRating(5)
  }

  return (
    <section id="comments-section" className="py-12 bg-white">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-2 mb-6">
            <MessageCircle size={24} className="text-gray-600" />
            <h2 className="text-2xl font-bold text-gray-900">Kommentarer ({localComments.length})</h2>
          </div>

          {/* Comment Form */}
          <form onSubmit={handleSubmitComment} className="mb-8">
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Din bedømmelse
                </label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-2xl ${
                        star <= rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                  Din kommentar
                </label>
                <textarea
                  id="comment"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Del dine erfaringer med denne opskrift..."
                />
              </div>

              <button
                type="submit"
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Send size={16} />
                <span>Send kommentar</span>
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-6">
            {localComments.map((comment) => (
              <div key={comment.id} className="border-b border-gray-200 pb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{comment.author}</span>
                    <span className="text-sm text-gray-500">{comment.date}</span>
                  </div>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-sm ${
                          star <= comment.rating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">{comment.content}</p>
              </div>
            ))}

            {localComments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Ingen kommentarer endnu. Vær den første til at dele dine erfaringer!
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
} 