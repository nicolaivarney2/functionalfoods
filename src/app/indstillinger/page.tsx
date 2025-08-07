'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Settings, Bell, Shield, Palette, Globe, Save, CheckCircle } from 'lucide-react'

interface UserSettings {
  emailNotifications: boolean
  pushNotifications: boolean
  weeklyNewsletter: boolean
  language: string
  theme: 'light' | 'dark' | 'auto'
  privacyLevel: 'public' | 'private'
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [settings, setSettings] = useState<UserSettings>({
    emailNotifications: true,
    pushNotifications: false,
    weeklyNewsletter: true,
    language: 'da',
    theme: 'light',
    privacyLevel: 'public'
  })

  useEffect(() => {
    if (user) {
      // Load user settings from localStorage or database
      const savedSettings = localStorage.getItem('user_settings')
      if (savedSettings) {
        setSettings({ ...settings, ...JSON.parse(savedSettings) })
      }
    }
  }, [user])

  const handleSettingChange = (key: keyof UserSettings, value: any) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('user_settings', JSON.stringify(newSettings))
  }

  const handleSaveSettings = async () => {
    setLoading(true)
    setMessage('')

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setMessage('Indstillinger gemt!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('Der opstod en fejl. Prøv igen.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="text-center">
                <Settings size={48} className="mx-auto text-gray-400 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Log ind for at se indstillinger</h1>
                <p className="text-gray-600">Du skal være logget ind for at få adgang til dine indstillinger.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <Settings size={32} className="text-gray-600" />
              <h1 className="text-3xl font-bold text-gray-900">Indstillinger</h1>
            </div>
            <p className="text-gray-600">Administrer dine kontoindstillinger og præferencer</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Notifications */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <Bell size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Notifikationer</h2>
                  <p className="text-sm text-gray-500">Styr hvornår du vil have beskeder</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Email notifikationer</h3>
                    <p className="text-xs text-gray-500">Få beskeder på email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Push notifikationer</h3>
                    <p className="text-xs text-gray-500">Få beskeder i browseren</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.pushNotifications}
                      onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Ugentlig nyhedsbrev</h3>
                    <p className="text-xs text-gray-500">Få nye opskrifter hver uge</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.weeklyNewsletter}
                      onChange={(e) => handleSettingChange('weeklyNewsletter', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Appearance & Language */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                  <Palette size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Udseende & Sprog</h2>
                  <p className="text-sm text-gray-500">Tilpas dit brugerinterface</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sprog
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => handleSettingChange('language', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="da">Dansk</option>
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tema
                  </label>
                  <select
                    value={settings.theme}
                    onChange={(e) => handleSettingChange('theme', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="light">Lyst</option>
                    <option value="dark">Mørkt</option>
                    <option value="auto">Automatisk</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Privacy */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <Shield size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Privatliv</h2>
                  <p className="text-sm text-gray-500">Styr hvem der kan se din profil</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profil synlighed
                  </label>
                  <select
                    value={settings.privacyLevel}
                    onChange={(e) => handleSettingChange('privacyLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="public">Offentlig</option>
                    <option value="private">Privat</option>
                  </select>
                </div>

                <div className="text-xs text-gray-500">
                  <p>• Offentlig: Andre kan se dine kommentarer og favoritter</p>
                  <p>• Privat: Kun du kan se dine aktiviteter</p>
                </div>
              </div>
            </div>

            {/* Account Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                  <Globe size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Konto handlinger</h2>
                  <p className="text-sm text-gray-500">Administrer din konto</p>
                </div>
              </div>

              <div className="space-y-3">
                <button className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  Download mine data
                </button>
                <button className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  Slet konto
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={loading}
              className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              <span>{loading ? 'Gemmer...' : 'Gem indstillinger'}</span>
            </button>
          </div>

          {/* Message Display */}
          {message && (
            <div className="mt-6 p-4 rounded-lg flex items-center space-x-2 bg-green-50 border border-green-200 text-green-800">
              <CheckCircle size={16} />
              <span>{message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 