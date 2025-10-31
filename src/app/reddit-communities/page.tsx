'use client'

import { useState } from 'react'
import { ExternalLink, Users, MessageCircle, Search, Filter } from 'lucide-react'
import RedditCommunityWidget from '@/components/RedditCommunityWidget'

interface RedditCommunity {
  name: string
  displayName: string
  description: string
  memberCount: string
  url: string
  color: string
  category: string
  recentPosts: number
}

const redditCommunities: RedditCommunity[] = [
  {
    name: 'DKketo',
    displayName: 'r/DKketo',
    description: 'Keto diæt på dansk - del tips, opskrifter og erfaringer',
    memberCount: '1.2k',
    url: 'https://reddit.com/r/DKketo',
    color: '#8B5CF6',
    category: 'Keto',
    recentPosts: 12
  },
  {
    name: 'DKvaegttab',
    displayName: 'r/DKvaegttab',
    description: 'Vægttab og sundhed - motivation og støtte',
    memberCount: '2.1k',
    url: 'https://reddit.com/r/DKvaegttab',
    color: '#EF4444',
    category: 'Vægttab',
    recentPosts: 18
  },
  {
    name: 'DKlchf',
    displayName: 'r/DKlchf',
    description: 'LCHF diæt på dansk - lav kulhydrat, høj fedt',
    memberCount: '850',
    url: 'https://reddit.com/r/DKlchf',
    color: '#10B981',
    category: 'LCHF',
    recentPosts: 8
  },
  {
    name: 'DKpaleo',
    displayName: 'r/DKpaleo',
    description: 'Paleo diæt på dansk - naturlig kost',
    memberCount: '420',
    url: 'https://reddit.com/r/DKpaleo',
    color: '#F59E0B',
    category: 'Paleo',
    recentPosts: 5
  },
  {
    name: 'DKmealprep',
    displayName: 'r/DKmealprep',
    description: 'Meal prep og madplanlægning - spar tid og penge',
    memberCount: '680',
    url: 'https://reddit.com/r/DKmealprep',
    color: '#06B6D4',
    category: 'Meal Prep',
    recentPosts: 15
  },
  {
    name: 'DKantiinflammatorisk',
    displayName: 'r/DKantiinflammatorisk',
    description: 'Anti-inflammatorisk kost - reducér inflammation',
    memberCount: '320',
    url: 'https://reddit.com/r/DKantiinflammatorisk',
    color: '#84CC16',
    category: 'Sundhed',
    recentPosts: 3
  },
  {
    name: 'DKfleksitarisk',
    displayName: 'r/DKfleksitarisk',
    description: 'Fleksitarisk livsstil - fleksibel plantebaseret kost',
    memberCount: '190',
    url: 'https://reddit.com/r/DKfleksitarisk',
    color: '#EC4899',
    category: 'Plantebaseret',
    recentPosts: 2
  },
  {
    name: 'DK52diet',
    displayName: 'r/DK52diet',
    description: '5:2 diæt på dansk - intermittent fasting',
    memberCount: '150',
    url: 'https://reddit.com/r/DK52diet',
    color: '#8B5A2B',
    category: 'Fasting',
    recentPosts: 4
  },
  {
    name: 'DKfamiliemad',
    displayName: 'r/DKfamiliemad',
    description: 'Familiemad og børn - sund mad for hele familien',
    memberCount: '1.8k',
    url: 'https://reddit.com/r/DKfamiliemad',
    color: '#F97316',
    category: 'Familie',
    recentPosts: 22
  },
  {
    name: 'DKmadbudget',
    displayName: 'r/DKmadbudget',
    description: 'Mad på budget - spar penge på mad',
    memberCount: '950',
    url: 'https://reddit.com/r/DKmadbudget',
    color: '#6366F1',
    category: 'Budget',
    recentPosts: 14
  }
]

const categories = ['Alle', 'Keto', 'Vægttab', 'LCHF', 'Paleo', 'Meal Prep', 'Sundhed', 'Plantebaseret', 'Fasting', 'Familie', 'Budget']

export default function RedditCommunitiesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Alle')

  const filteredCommunities = redditCommunities.filter(community => {
    const matchesSearch = community.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         community.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'Alle' || community.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <h1 className="text-4xl font-bold text-gray-900">Vores Reddit Communities</h1>
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join vores danske communities og få støtte, tips og inspiration på din sundhedsrejse
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Søg i communities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Communities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCommunities.map((community) => (
            <div
              key={community.name}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: community.color }}
                  />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {community.displayName}
                  </h3>
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {community.category}
                </span>
              </div>

              <p className="text-gray-600 mb-4 text-sm">
                {community.description}
              </p>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Users size={14} />
                    <span>{community.memberCount} medlemmer</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageCircle size={14} />
                    <span>{community.recentPosts} nye posts</span>
                  </div>
                </div>
              </div>

              <a
                href={community.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-colors"
              >
                <span>Join Community</span>
                <ExternalLink size={14} />
              </a>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredCommunities.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <Search size={48} />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Ingen communities fundet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Prøv at ændre dine søgekriterier.
            </p>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">
            Mangler du et community?
          </h2>
          <p className="text-lg mb-6 opacity-90">
            Vi bygger hele tiden nye communities. Følg os for at være den første til at høre om nye subreddits!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://reddit.com/user/FunctionalFoodsDK"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-orange-500 hover:bg-gray-100 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Følg os på Reddit
            </a>
            <a
              href="/"
              className="border-2 border-white text-white hover:bg-white hover:text-orange-500 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Tilbage til Functional Foods
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
