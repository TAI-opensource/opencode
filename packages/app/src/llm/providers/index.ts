/**
 * LLM Provider exports
 */

export { createOpenAIClient, type OpenAIConfig } from './openai'
export { createAnthropicClient, type AnthropicConfig } from './anthropic'
export { createGroqClient, type GroqConfig } from './groq'
export { createGoogleClient, type GoogleConfig } from './google'
export { createOpenRouterClient, type OpenRouterConfig } from './openrouter'

export type { ChatMessage, StreamChunk } from './openai'

export type LLMProvider =
  | 'openai'
  | 'anthropic'
  | 'groq'
  | 'google'
  | 'openrouter'

export interface LLMClient {
  chat(options: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    model?: string
    temperature?: number
    maxTokens?: number
  }): Promise<string>

  stream(options: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    model?: string
    temperature?: number
    maxTokens?: number
  }): AsyncGenerator<{ content: string; done: boolean }>
}

export function createLLMClient(
  provider: LLMProvider,
  config: Record<string, string>
): LLMClient {
  switch (provider) {
    case 'openai':
      return createOpenAIClient({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
      }) as unknown as LLMClient
    case 'anthropic':
      return createAnthropicClient({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
      }) as unknown as LLMClient
    case 'groq':
      return createGroqClient({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
      }) as unknown as LLMClient
    case 'google':
      return createGoogleClient({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
      }) as unknown as LLMClient
    case 'openrouter':
      return createOpenRouterClient({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
      }) as unknown as LLMClient
    default:
      throw new Error(`Unknown LLM provider: ${provider}`)
  }
}
