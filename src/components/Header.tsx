'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Search, Menu, X } from 'lucide-react'

const mainMenuItems = [
  { name: 'Vægttab', href: '/vaegttab' },
  { name: 'Mad budget', href: '/mad-budget' },
  { name: 'Mental sundhed', href: '/mental-sundhed' },
  { name: 'Opskrifter til vægttab', href: '/opskrifter-til-vaegttab' },
  { name: 'Bag om FF', href: '/bag-om-ff' },
]

const dietaryCategories = [
  { name: 'KETO', href: '/opskrifter/keto' },
  { name: 'SENSE', href: '/opskrifter/sense' },
  { name: 'LCHF/PALEO', href: '/opskrifter/lchf-paleo' },
  { name: 'MEAL PREP', href: '/opskrifter/meal-prep' },
  { name: 'ANTI-INFLAMMATORISK', href: '/opskrifter/anti-inflammatory' },
  { name: 'MIDDELHAVSDIÆTEN', href: '/opskrifter/mediterranean' },
  { name: 'FLEKSITARISK', href: '/opskrifter/flexitarian' },
  { name: '5:2 DIÆT', href: '/opskrifter/5-2-diet' },
]

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="bg-white border-b border-gray-200">
      {/* Top Menu - Black Background */}
      <div className="bg-black text-white">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="text-2xl font-bold">FF</div>
              <span className="text-lg font-medium">Functional Foods</span>
            </Link>

            {/* Desktop Main Menu */}
            <nav className="hidden md:flex items-center space-x-8">
              {mainMenuItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-white hover:text-gray-300 transition-colors text-sm"
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Search and Mobile Menu */}
            <div className="flex items-center space-x-4">
              <button className="text-white hover:text-gray-300 transition-colors">
                <Search size={20} />
              </button>
              
              {/* Mobile Menu Button */}
              <button
                className="md:hidden text-white"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Menu - White Background with Horizontal Scroll */}
      <div className="bg-white">
        <div className="container">
          <div className="relative">
            {/* Scrollable Navigation */}
            <nav className="flex items-center h-12 text-sm font-medium overflow-x-auto scrollbar-hide hover:cursor-grab active:cursor-grabbing">
              <div className="flex items-center space-x-8 min-w-max px-4">
                {dietaryCategories.map((category) => (
                  <Link
                    key={category.name}
                    href={category.href}
                    className="text-gray-900 hover:text-gray-600 transition-colors whitespace-nowrap"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </nav>
            
            {/* Scroll Indicators */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none">
              {/* Swipe indicator dots */}
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                <div className="w-1 h-1 bg-gray-400 rounded-full opacity-60 scroll-indicator"></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full opacity-40 scroll-indicator" style={{animationDelay: '0.5s'}}></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full opacity-20 scroll-indicator" style={{animationDelay: '1s'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="container py-4">
            <nav className="flex flex-col space-y-4">
              {mainMenuItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-900 hover:text-gray-600 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-2 gap-2">
                  {dietaryCategories.map((category) => (
                    <Link
                      key={category.name}
                      href={category.href}
                      className="text-gray-900 hover:text-gray-600 transition-colors text-sm"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
} 