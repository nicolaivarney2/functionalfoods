'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { useImageMigration } from '@/hooks/useImageMigration'
import { 
  BookOpen, 
  Calendar, 
  Cog, 
  Database, 
  Home, 
  Image, 
  List, 
  Settings, 
  Users,
  X,
  Menu,
  Loader2
} from 'lucide-react'

interface AdminLayoutProps {
  children: React.ReactNode
}

const adminNavItems = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: Home,
    description: 'Admin oversigt'
  },
  {
    name: 'Import',
    href: '/admin/import',
    icon: Database,
    description: 'Import opskrifter og tjek database'
  },
  {
    name: 'Publishing',
    href: '/admin/publishing',
    icon: Calendar,
    description: 'Planlæg og udgiv opskrifter'
  },
  {
    name: 'Alle Opskrifter',
    href: '/admin/recipes',
    icon: BookOpen,
    description: 'Administrer alle opskrifter'
  },
  {
    name: 'Ingredient Matching',
    href: '/admin/ingredient-matching',
    icon: Database,
    description: 'Match ingredienser med Frida DTU'
  },
  {
    name: 'Seneste Matches',
    href: '/admin/ingredient-matching/recent',
    icon: List,
    description: 'Se og administrer seneste matches'
  },
  {
    name: 'Billeder',
    href: '/admin/images',
    icon: Image,
    description: 'Administrer opskriftsbilleder'
  },
  {
    name: 'Brugere',
    href: '/admin/users',
    icon: Users,
    description: 'Administrer brugerroller'
  },
  {
    name: 'Dagligvarer',
    href: '/admin/dagligvarer',
    icon: Database,
    description: 'Supermarked produkter og priser'
  },
  {
    name: 'Indstillinger',
    href: '/admin/settings',
    icon: Settings,
    description: 'System indstillinger'
  }
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { isAdmin, checking } = useAdminAuth()
  const router = useRouter()
  
  // Automatic image migration hook
  const { isMigrating, migrationResult } = useImageMigration()

  // Centralized auth check for all admin pages
  useEffect(() => {
    if (!checking && !isAdmin) {
      console.log('🔒 AdminLayout: Not admin, redirecting to home')
      router.push('/')
    }
  }, [isAdmin, checking, router])

  // Show loading while checking auth
  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto">
            <Loader2 className="h-12 w-12 text-blue-600" />
          </div>
          <p className="mt-4 text-gray-600">Tjekker admin rettigheder...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if not admin (will redirect)
  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
            <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4 border-b border-gray-200">
            <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1">
              <h2 className="text-lg font-medium text-gray-900">
                {adminNavItems.find(item => item.href === pathname)?.name || 'Admin'}
              </h2>
              
              {/* Image migration status */}
              {isMigrating && (
                <div className="ml-4 flex items-center text-sm text-blue-600">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Migrerer billeder...
                </div>
              )}
              
              {migrationResult && !isMigrating && (
                <div className="ml-4 flex items-center text-sm text-green-600">
                  ✅ {migrationResult.migratedImages} billeder migreret
                </div>
              )}
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <Link
                href="/"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Tilbage til hjemmeside
              </Link>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
