'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminCheck } from '@/hooks/useAdminCheck'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { signIn, signUp } = useAuth()
  const { isAdmin } = useAdminCheck()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, name)
        if (error) {
          setError(error.message)
        } else {
          setSuccess('Tjek din email for at bekræfte din konto! Du vil blive sendt tilbage til denne side efter bekræftelse.')
        }
      } else {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
        } else {
          onClose()
          // Redirect admin users to admin panel
          if (isAdmin) {
            router.push('/admin')
          }
        }
      }
    } catch (err) {
      setError('Der opstod en fejl. Prøv igen.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isSignUp ? 'Opret konto' : 'Log ind'}
          </h2>
          <p className="text-gray-600">
            {isSignUp 
              ? 'Få adgang til alle funktioner og gem dine favoritopskrifter'
              : 'Log ind for at kommentere og gemme opskrifter'
            }
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Navn
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Dit navn"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="din@email.dk"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adgangskode
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Din adgangskode"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Error/Success messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Indlæser...' : (isSignUp ? 'Opret konto' : 'Log ind')}
          </button>
        </form>

        {/* Toggle sign up/login */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {isSignUp ? 'Har du allerede en konto?' : 'Har du ikke en konto?'}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
                setSuccess('')
              }}
              className="ml-1 text-green-600 hover:text-green-700 font-medium"
            >
              {isSignUp ? 'Log ind' : 'Opret konto'}
            </button>
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Få adgang til:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Gem dine favoritopskrifter
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Skriv kommentarer og få svar
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Få gratis sparring til vægttab
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Personlige anbefalinger
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
} 