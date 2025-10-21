'use client'

import { ExternalLink, MessageCircle } from 'lucide-react'

interface RedditDiscussionLinkProps {
  redditPostId?: string
  subreddit?: string
  title?: string
  className?: string
}

export default function RedditDiscussionLink({ 
  redditPostId, 
  subreddit, 
  title,
  className = '' 
}: RedditDiscussionLinkProps) {
  
  if (!redditPostId || !subreddit) return null
  
  const redditUrl = `https://reddit.com/r/${subreddit}/comments/${redditPostId}`
  const displaySubreddit = subreddit.startsWith('DK') ? subreddit : `DK${subreddit}`
  
  return (
    <div className={`bg-orange-50 border border-orange-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">R</span>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">
            Diskuter på Reddit
          </h4>
          <p className="text-sm text-gray-600">
            {title ? `"${title}"` : 'Denne artikel'} er diskuteret på r/{displaySubreddit}
          </p>
        </div>
        <a
          href={redditUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
        >
          <MessageCircle size={14} />
          <span>Deltag i diskussionen</span>
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  )
}
