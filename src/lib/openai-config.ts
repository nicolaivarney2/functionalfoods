import fs from 'fs'
import path from 'path'

interface OpenAIConfig {
  apiKey: string
  assistantId: string
}

const CONFIG_FILE = path.join(process.cwd(), '.openai-config.json')

export function getOpenAIConfig(): OpenAIConfig | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configData = fs.readFileSync(CONFIG_FILE, 'utf-8')
      const config = JSON.parse(configData)
      
      if (config.apiKey && config.assistantId) {
        return config
      }
    }
  } catch (error) {
    console.error('Error reading OpenAI config:', error)
  }
  
  return null
}

export function saveOpenAIConfig(config: OpenAIConfig): boolean {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
    return true
  } catch (error) {
    console.error('Error saving OpenAI config:', error)
    return false
  }
}

export function updateOpenAIConfig(updates: Partial<OpenAIConfig>): boolean {
  try {
    const currentConfig = getOpenAIConfig() || { apiKey: '', assistantId: '' }
    const newConfig = { ...currentConfig, ...updates }
    return saveOpenAIConfig(newConfig)
  } catch (error) {
    console.error('Error updating OpenAI config:', error)
    return false
  }
}

