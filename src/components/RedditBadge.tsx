'use client'

interface RedditBadgeProps {
  subreddit: string
  className?: string
}

export default function RedditBadge({ subreddit, className = '' }: RedditBadgeProps) {
  const displaySubreddit = subreddit.startsWith('DK') ? subreddit : `DK${subreddit}`
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 ${className}`}>
      <span className="w-2 h-2 bg-orange-500 rounded-full mr-1.5" />
      Originalt på r/{displaySubreddit}
    </span>
  )
}
