'use client'

import { Share2, Facebook, Instagram, MessageCircle, Send, Heart } from 'lucide-react'

interface SocialSharingProps {
  recipeTitle: string
  recipeUrl: string
  recipeImage?: string
  recipeDescription?: string
}

export default function SocialSharing({ 
  recipeTitle, 
  recipeUrl, 
  recipeImage, 
  recipeDescription 
}: SocialSharingProps) {
  
  const shareText = `Tjek denne fantastiske opskrift: ${recipeTitle}`
  const encodedUrl = encodeURIComponent(recipeUrl)
  const encodedText = encodeURIComponent(shareText)
  const encodedImage = recipeImage ? encodeURIComponent(recipeImage) : ''
  const encodedDescription = recipeDescription ? encodeURIComponent(recipeDescription) : ''

  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    messenger: `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=YOUR_APP_ID&redirect_uri=${encodedUrl}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage}&description=${encodedDescription}`,
    copy: recipeUrl
  }

  const handleShare = (platform: keyof typeof shareUrls) => {
    const url = shareUrls[platform]
    
    if (platform === 'copy') {
      navigator.clipboard.writeText(url).then(() => {
        // You could add a toast notification here
        console.log('Link kopieret til udklipsholder')
      })
      return
    }

    // Open in new window
    window.open(url, '_blank', 'width=600,height=400')
  }

  const shareButtons = [
    {
      platform: 'facebook' as const,
      label: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600 hover:bg-blue-700',
      textColor: 'text-white'
    },
    {
      platform: 'whatsapp' as const,
      label: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-500 hover:bg-green-600',
      textColor: 'text-white'
    },
    {
      platform: 'messenger' as const,
      label: 'Messenger',
      icon: Send,
      color: 'bg-blue-500 hover:bg-blue-600',
      textColor: 'text-white'
    },
    {
      platform: 'pinterest' as const,
      label: 'Pinterest',
      icon: Heart,
      color: 'bg-red-600 hover:bg-red-700',
      textColor: 'text-white'
    },
    {
      platform: 'copy' as const,
      label: 'Kopier link',
      icon: Share2,
      color: 'bg-gray-600 hover:bg-gray-700',
      textColor: 'text-white'
    }
  ]

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Del denne opskrift</h3>
        <p className="text-sm text-gray-600">Hjælp andre med at opdage denne fantastiske opskrift</p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {shareButtons.map(({ platform, label, icon: Icon, color, textColor }) => (
          <button
            key={platform}
            onClick={() => handleShare(platform)}
            className={`${color} ${textColor} rounded-lg px-4 py-3 flex flex-col items-center space-y-2 transition-colors duration-200 hover:shadow-md`}
          >
            <Icon size={20} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Direkte link:</span>
          <button
            onClick={() => handleShare('copy')}
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            Kopier
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1 break-all">{recipeUrl}</p>
      </div>
    </div>
  )
} 