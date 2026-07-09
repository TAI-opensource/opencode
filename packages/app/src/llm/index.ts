/**
 * LLM Engine - Main entry point for LLM operations
 */

import { createLLMClient, type LLMProvider, type LLMClient } from './providers'
import { accumulateStream, transformStream, type StreamEvent } from './stream'

export interface LLMConfig {
  provider: LLMProvider
  apiKey: string
  baseUrl?: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface ChatOptions {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  onChunk?: (chunk: string) => void
}

export interface ChatResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * LLM Engine class
 */
export class LLMEngine {
  private clients: Map<string, LLMClient> = new Map()
  private configs: Map<string, LLMConfig> = new Map()

  /**
   * Register a provider configuration
   */
  registerProvider(name: string, config: LLMConfig): void {
    this.configs.set(name, config)
    const client = createLLMClient(config.provider, {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
    })
    this.clients.set(name, client)
    console.log(`[LLM] Provider registered: ${name} (${config.provider})`)
  }

  /**
   * Remove a provider
   */
  removeProvider(name: string): void {
    this.clients.delete(name)
    this.configs.delete(name)
    console.log(`[LLM] Provider removed: ${name}`)
  }

  /**
   * Get available providers
   */
  getProviders(): string[] {
    return Array.from(this.clients.keys())
  }

  /**
   * Chat completion (non-streaming)
   */
  async chat(
    provider: string,
    options: ChatOptions
  ): Promise<ChatResponse> {
    const client = this.getClient(provider)
    const config = this.getConfig(provider)

    const content = await client.chat({
      messages: options.messages,
      model: options.model ?? config.model,
      temperature: options.temperature ?? config.temperature,
      maxTokens: options.maxTokens ?? config.maxTokens,
    })

    return { content }
  }

  /**
   * Chat completion (streaming)
   */
  async *chatStream(
    provider: string,
    options: ChatOptions
  ): AsyncGenerator<StreamEvent> {
    const client = this.getClient(provider)
    const config = this.getConfig(provider)

    const stream = client.stream({
      messages: options.messages,
      model: options.model ?? config.model,
      temperature: options.temperature ?? config.temperature,
      maxTokens: options.maxTokens ?? config.maxTokens,
    })

    if (options.onChunk) {
      await transformStream(stream, options.onChunk)
    } else {
      yield* stream
    }
  }

  /**
   * Simple completion helper
   */
  async complete(
    provider: string,
    prompt: string,
    options?: {
      system?: string
      model?: string
      temperature?: number
      maxTokens?: number
    }
  ): Promise<string> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []

    if (options?.system) {
      messages.push({ role: 'system', content: options.system })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await this.chat(provider, {
      messages,
      model: options?.model,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    })

    return response.content
  }

  /**
   * Code completion helper
   */
  async codeComplete(
    provider: string,
    code: string,
    context?: string,
    options?: {
      language?: string
      model?: string
    }
  ): Promise<string> {
    const systemPrompt = `You are a code completion assistant. Complete the code based on the context provided.
Only return the completed code, no explanations.
Language: ${options?.language ?? 'auto'}`

    const userPrompt = context
      ? `Context:\n${context}\n\nComplete:\n${code}`
      : `Complete:\n${code}`

    return this.complete(provider, userPrompt, {
      system: systemPrompt,
      model: options?.model,
      temperature: 0.2,
      maxTokens: 1024,
    })
  }

  /**
   * Code explanation helper
   */
  async explainCode(
    provider: string,
    code: string,
    options?: {
      language?: string
      detail?: 'brief' | 'detailed'
      model?: string
    }
  ): Promise<string> {
    const systemPrompt = `You are a code explanation assistant. Explain the provided code clearly and concisely.
Detail level: ${options?.detail ?? 'brief'}
Language: ${options?.language ?? 'auto'}`

    return this.complete(provider, code, {
      system: systemPrompt,
      model: options?.model,
      temperature: 0.3,
    })
  }

  /**
   * Code review helper
   */
  async reviewCode(
    provider: string,
    code: string,
    options?: {
      language?: string
      focus?: 'bugs' | 'performance' | 'style' | 'all'
      model?: string
    }
  ): Promise<string> {
    const systemPrompt = `You are a code review assistant. Review the provided code and provide constructive feedback.
Focus: ${options?.focus ?? 'all'}
Language: ${options?.language ?? 'auto'}`

    return this.complete(provider, code, {
      system: systemPrompt,
      model: options?.model,
      temperature: 0.3,
    })
  }

  private getClient(provider: string): LLMClient {
    const client = this.clients.get(provider)
    if (!client) {
      throw new Error(`LLM provider not found: ${provider}`)
    }
    return client
  }

  private getConfig(provider: string): LLMConfig {
    const config = this.configs.get(provider)
    if (!config) {
      throw new Error(`LLM provider config not found: ${provider}`)
    }
    return config
  }
}

/**
 * Global LLM engine instance
 */
export const llmEngine = new LLMEngine()

/**
 * Initialize LLM engine with stored configurations
 */
export async function initLLMEngine(): Promise<void> {
  try {
    const stored = localStorage.getItem('opencode_llm_providers')
    if (stored) {
      const providers = JSON.parse(stored)
      for (const [name, config] of Object.entries(providers)) {
        llmEngine.registerProvider(name, config as LLMConfig)
      }
      console.log('[LLM] Engine initialized with stored providers')
    }
  } catch (error) {
    console.error('[LLM] Failed to initialize engine:', error)
  }
}

/**
 * Save provider configurations
 */
export function saveProviderConfigs(): void {
  const configs: Record<string, LLMConfig> = {}
  for (const name of llmEngine.getProviders()) {
    configs[name] = llmEngine['configs'].get(name)!
  }
  localStorage.setItem('opencode_llm_providers', JSON.stringify(configs))
}
