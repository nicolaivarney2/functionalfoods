'use client'

import { ExternalLink, Users, MessageCircle } from 'lucide-react'

interface RedditCommunity {
  name: string
  displayName: string
  description: string
  memberCount?: string
  url: string
  color: string
}

interface RedditCommunityWidgetProps {
  category?: string
  showAll?: boolean
  className?: string
}

const redditCommunities: RedditCommunity[] = [
  {
    name: 'DKketo',
    displayName: 'r/DKketo',
    description: 'Keto diæt på dansk',
    memberCount: '1.2k',
    url: 'https://reddit.com/r/DKketo',
    color: '#8B5CF6'
  },
  {
    name: 'DKvaegttab',
    displayName: 'r/DKvaegttab',
    description: 'Vægttab og sundhed',
    memberCount: '2.1k',
    url: 'https://reddit.com/r/DKvaegttab',
    color: '#EF4444'
  },
  {
    name: 'DKlchf',
    displayName: 'r/DKlchf',
    description: 'LCHF diæt på dansk',
    memberCount: '850',
    url: 'https://reddit.com/r/DKlchf',
    color: '#10B981'
  },
  {
    name: 'DKpaleo',
    displayName: 'r/DKpaleo',
    description: 'Paleo diæt på dansk',
    memberCount: '420',
    url: 'https://reddit.com/r/DKpaleo',
    color: '#F59E0B'
  },
  {
    name: 'DKmealprep',
    displayName: 'r/DKmealprep',
    description: 'Meal prep og madplanlægning',
    memberCount: '680',
    url: 'https://reddit.com/r/DKmealprep',
    color: '#06B6D4'
  },
  {
    name: 'DKantiinflammatorisk',
    displayName: 'r/DKantiinflammatorisk',
    description: 'Anti-inflammatorisk kost',
    memberCount: '320',
    url: 'https://reddit.com/r/DKantiinflammatorisk',
    color: '#84CC16'
  },
  {
    name: 'DKfleksitarisk',
    displayName: 'r/DKfleksitarisk',
    description: 'Fleksitarisk livsstil',
    memberCount: '190',
    url: 'https://reddit.com/r/DKfleksitarisk',
    color: '#EC4899'
  },
  {
    name: 'DK52diet',
    displayName: 'r/DK52diet',
    description: '5:2 diæt på dansk',
    memberCount: '150',
    url: 'https://reddit.com/r/DK52diet',
    color: '#8B5A2B'
  },
  {
    name: 'DKfamiliemad',
    displayName: 'r/DKfamiliemad',
    description: 'Familiemad og børn',
    memberCount: '1.8k',
    url: 'https://reddit.com/r/DKfamiliemad',
    color: '#F97316'
  },
  {
    name: 'DKmadbudget',
    displayName: 'r/DKmadbudget',
    description: 'Mad på budget',
    memberCount: '950',
    url: 'https://reddit.com/r/DKmadbudget',
    color: '#6366F1'
  }
]

export default function RedditCommunityWidget({ 
  category, 
  showAll = false, 
  className = '' 
}: RedditCommunityWidgetProps) {
  
  const getCommunitiesForCategory = (category?: string) => {
    if (!category) return redditCommunities
    
    const categoryMap: { [key: string]: string[] } = {
      'keto': ['DKketo'],
      'glp-1': ['DKlchf', 'DKpaleo'],
      'glp1': ['DKlchf', 'DKpaleo'],
      'vaegttab': ['DKvaegttab', 'DKketo', 'DK52diet'],
      'mealprep': ['DKmealprep', 'DKfamiliemad'],
      'antiinflammatorisk': ['DKantiinflammatorisk'],
      'fleksitarisk': ['DKfleksitarisk'],
      '52diet': ['DK52diet', 'DKvaegttab'],
      'familiemad': ['DKfamiliemad', 'DKmealprep'],
      'madbudget': ['DKmadbudget', 'DKfamiliemad']
    }
    
    const relevantNames = categoryMap[category?.toLowerCase()] || []
    return redditCommunities.filter(community => 
      relevantNames.includes(community.name)
    )
  }
  
  const communities = showAll ? redditCommunities : getCommunitiesForCategory(category)
  
  if (communities.length === 0) return null
  
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">R</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {showAll ? 'Vores Reddit Communities' : 'Diskuter på Reddit'}
          </h3>
          <p className="text-sm text-gray-600">
            {showAll 
              ? 'Join vores danske communities' 
              : 'Få hjælp og del erfaringer'
            }
          </p>
        </div>
      </div>
      
      <div className="space-y-3">
        {communities.map((community) => (
          <a
            key={community.name}
            href={community.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: community.color }}
              />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900 group-hover:text-gray-700">
                    {community.displayName}
                  </span>
                  {community.memberCount && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {community.memberCount} medlemmer
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {community.description}
                </p>
              </div>
            </div>
            <ExternalLink size={16} className="text-gray-400 group-hover:text-gray-600" />
          </a>
        ))}
      </div>
      
      {!showAll && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <a
            href="/reddit-communities"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
          >
            <Users size={14} />
            <span>Se alle vores Reddit communities</span>
          </a>
        </div>
      )}
    </div>
  )
}
