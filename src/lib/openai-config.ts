import fs from 'fs'
import path from 'path'

interface OpenAIConfig {
  apiKey: string
  assistantId: string
  midjourneyWebhookUrl?: string
  midjourneyPromptTemplate?: string
}

// Check if we're in a serverless environment (Vercel)
const isServerless = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'

const CONFIG_FILE = isServerless 
  ? '/tmp/openai-config.json' // Vercel uses /tmp for temporary storage
  : path.join(process.cwd(), '.openai-config.json')

export function getOpenAIConfig(): OpenAIConfig | null {
  try {
    // In serverless environment, try to get config from environment variables
    if (isServerless) {
      const apiKey = process.env.OPENAI_API_KEY
      const assistantId = process.env.OPENAI_ASSISTANT_ID
      const midjourneyWebhookUrl = process.env.MAKE_MIDJOURNEY_WEBHOOK_URL
      const midjourneyPromptTemplate = process.env.MIDJOURNEY_PROMPT_TEMPLATE
      
      if (apiKey && assistantId) {
        return { 
          apiKey, 
          assistantId,
          midjourneyWebhookUrl,
          midjourneyPromptTemplate
        }
      }
      
      console.warn('OpenAI config not available in serverless environment')
      return null
    }
    
    // Local environment - read from file
    if (fs.existsSync(CONFIG_FILE)) {
      const configData = fs.readFileSync(CONFIG_FILE, 'utf-8')
      const config = JSON.parse(configData)
      
      if (config.apiKey && config.assistantId) {
        return {
          apiKey: config.apiKey,
          assistantId: config.assistantId,
          midjourneyWebhookUrl: config.midjourneyWebhookUrl,
          midjourneyPromptTemplate: config.midjourneyPromptTemplate
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
      console.warn('Cannot save OpenAI config in serverless environment')
      return false
    }
    
    // Local environment - save to file
    const configData = JSON.stringify({
      apiKey: config.apiKey,
      assistantId: config.assistantId,
      midjourneyWebhookUrl: config.midjourneyWebhookUrl || '',
      midjourneyPromptTemplate: config.midjourneyPromptTemplate || ''
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
    const currentConfig = getOpenAIConfig() || { apiKey: '', assistantId: '' }
    const newConfig = { ...currentConfig, ...updates }
    return saveOpenAIConfig(newConfig)
  } catch (error) {
    console.error('Error updating OpenAI config:', error)
    return false
  }
}

