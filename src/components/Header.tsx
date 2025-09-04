'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { Search, Menu, X, User, LogOut, Settings, Heart, Shield } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import LoginModal from './LoginModal'

const mainMenuItems = [
  { name: 'OPSKRIFTER', href: '/opskriftsoversigt' },
  { name: 'DAGLIGVARER', href: '/dagligvarer' },
  { name: 'MADBUDGET', href: '/madbudget' },
  { name: 'VÆGTTAB', href: '/vaegttab' },
  { name: 'BAG OM FF', href: '/bag-om-ff' },
]

const dietaryCategories = [
  { name: 'FAMILIEMAD', href: '/opskrifter/familie' },
  { name: 'KETO', href: '/opskrifter/keto' },
  { name: 'SENSE', href: '/opskrifter/sense' },
  { name: 'LCHF/PALEO', href: '/opskrifter/lchch-paleo' },
  { name: 'MEAL PREP', href: '/opskrifter/meal-prep' },
  { name: 'ANTI-INFLAMMATORISK', href: '/opskrifter/anti-inflammatory' },
  { name: 'FLEKSITARISK', href: '/opskrifter/flexitarian' },
  { name: '5:2 DIÆT', href: '/opskrifter/5-2-diet' },
]

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const { user, signOut } = useAuth()
  const { isAdmin } = useAdminAuth()
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setIsUserMenuOpen(false)
  }

  return (
    <>
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

              {/* Search and User Menu */}
              <div className="flex items-center space-x-4">
                <button className="text-white hover:text-gray-300 transition-colors">
                  <Search size={20} />
                </button>
                
                {/* User Menu */}
                {user ? (
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors"
                    >
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                        <User size={16} />
                      </div>
                      <span className="hidden md:block text-sm">
                        {user.user_metadata?.name || user.email?.split('@')[0]}
                      </span>
                    </button>

                    {/* User Dropdown */}
                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">
                            {user.user_metadata?.name || 'Bruger'}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        
                        <Link
                          href="/profil"
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <User size={16} />
                          <span>Min profil</span>
                        </Link>
                        
                        <Link
                          href="/favoritter"
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Heart size={16} />
                          <span>Mine favoritter</span>
                        </Link>
                        
                        <Link
                          href="/indstillinger"
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Settings size={16} />
                          <span>Indstillinger</span>
                        </Link>
                        
                        {/* Admin Link - Only visible to admins */}
                        {isAdmin && (
                          <Link
                            href="/admin"
                            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Shield size={16} />
                            <span>Admin Panel</span>
                          </Link>
                        )}
                        
                        <button
                          onClick={handleSignOut}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                        >
                          <LogOut size={16} />
                          <span>Log ud</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors"
                  >
                    <User size={20} />
                    <span className="hidden md:block text-sm">Log ind</span>
                  </button>
                )}
                
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
                
                {/* Mobile User Section */}
                {user ? (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                        <User size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.user_metadata?.name || 'Bruger'}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Link
                        href="/profil"
                        className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <User size={16} />
                        <span>Min profil</span>
                      </Link>
                      
                      <Link
                        href="/favoritter"
                        className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Heart size={16} />
                        <span>Mine favoritter</span>
                      </Link>
                      
                      <Link
                        href="/indstillinger"
                        className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Settings size={16} />
                        <span>Indstillinger</span>
                      </Link>
                      
                      <button
                        onClick={handleSignOut}
                        className="flex items-center space-x-2 text-red-600 hover:text-red-700 w-full text-left"
                      >
                        <LogOut size={16} />
                        <span>Log ud</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-gray-200 pt-4">
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        setIsLoginModalOpen(true)
                      }}
                      className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                    >
                      <User size={16} />
                      <span>Log ind</span>
                    </button>
                  </div>
                )}
                
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

      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </>
  )
} 