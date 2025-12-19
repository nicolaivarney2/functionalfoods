import fs from 'fs'
import path from 'path'

interface OpenAIConfig {
  apiKey: string
  assistantIds?: {
    familiemad: string
    keto: string
    sense: string
    'glp-1': string
    antiinflammatorisk: string
    fleksitarisk: string
    '5-2': string
    'meal-prep': string
  }
}

// Check if we're in a serverless environment (Vercel)
const isServerless = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'

const CONFIG_FILE = isServerless 
  ? '/tmp/openai-config.json' // Vercel uses /tmp for temporary storage
  : path.join(process.cwd(), '.openai-config.json')

export function getOpenAIConfig(): OpenAIConfig | null {
  try {
    // In serverless environment (Vercel production), only use environment variables
    if (isServerless) {
      const apiKey = process.env.OPENAI_API_KEY
      
      if (apiKey) {
        return { 
          apiKey,
          assistantIds: {
            familiemad: process.env.OPENAI_ASSISTANT_FAMILIEMAD || '',
            keto: process.env.OPENAI_ASSISTANT_KETO || '',
            sense: process.env.OPENAI_ASSISTANT_SENSE || '',
            'glp-1': process.env.OPENAI_ASSISTANT_GLP1 || '',
            antiinflammatorisk: process.env.OPENAI_ASSISTANT_ANTIINFLAMMATORISK || '',
            fleksitarisk: process.env.OPENAI_ASSISTANT_FLEKSITARISK || '',
            '5-2': process.env.OPENAI_ASSISTANT_5_2 || '',
            'meal-prep': process.env.OPENAI_ASSISTANT_MEAL_PREP || ''
          }
        }
      }
      
      console.warn('OpenAI config not available in serverless environment')
      return null
    }
    
    // Local environment - try multiple sources in order:
    // 1. Prefer config file written by /admin/settings (so bulk + single behave the same)
    if (fs.existsSync(CONFIG_FILE)) {
      const configData = fs.readFileSync(CONFIG_FILE, 'utf-8')
      const config = JSON.parse(configData)
      
      if (config.apiKey) {
        return {
          apiKey: config.apiKey,
          assistantIds: config.assistantIds || {
            familiemad: '',
            keto: '',
            sense: '',
            paleo: '',
            antiinflammatorisk: '',
            fleksitarisk: '',
            '5-2': '',
            'meal-prep': ''
          }
        }
      }
    }

    // 2. Fallback to .env (useful for localhost dev)
    const envApiKey = process.env.OPENAI_API_KEY
    if (envApiKey) {
      return {
        apiKey: envApiKey,
        assistantIds: {
          familiemad: process.env.OPENAI_ASSISTANT_FAMILIEMAD || '',
          keto: process.env.OPENAI_ASSISTANT_KETO || '',
          sense: process.env.OPENAI_ASSISTANT_SENSE || '',
          'glp-1': process.env.OPENAI_ASSISTANT_GLP1 || '',
          antiinflammatorisk: process.env.OPENAI_ASSISTANT_ANTIINFLAMMATORISK || '',
          fleksitarisk: process.env.OPENAI_ASSISTANT_FLEKSITARISK || '',
          '5-2': process.env.OPENAI_ASSISTANT_5_2 || '',
          'meal-prep': process.env.OPENAI_ASSISTANT_MEAL_PREP || ''
        }
      }
    }
  } catch (error) {
    console.error('Error reading OpenAI config:', error)
  }
  
  return null
}

export function saveOpenAIConfig(config: OpenAIConfig): boolean {
  try {
    // In serverless environment, we can't save files permanently
    if (isServerless) {
      console.warn('Cannot save OpenAI config in serverless environment - use environment variables instead')
      // In production, config should be set via environment variables
      // This function will return true to indicate "success" but won't actually save
      return true
    }
    
    // Local environment - save to file
    const configData = JSON.stringify({
      apiKey: config.apiKey,
      assistantIds: config.assistantIds || {}
    }, null, 2)
    fs.writeFileSync(CONFIG_FILE, configData)
    return true
  } catch (error) {
    console.error('Error saving OpenAI config:', error)
    return false
  }
}

export function updateOpenAIConfig(updates: Partial<OpenAIConfig>): boolean {
  try {
    const currentConfig = getOpenAIConfig() || { 
      apiKey: '', 
      assistantIds: {
        familiemad: '',
        keto: '',
        sense: '',
        'glp-1': '',
        antiinflammatorisk: '',
        fleksitarisk: '',
        '5-2': '',
        'meal-prep': ''
      }
    }
    const newConfig = { ...currentConfig, ...updates }
    return saveOpenAIConfig(newConfig)
  } catch (error) {
    console.error('Error updating OpenAI config:', error)
    return false
  }
}

