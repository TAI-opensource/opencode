/**
 * OpenRouter LLM Provider
 */

export interface OpenRouterConfig {
  apiKey: string
  baseUrl?: string
  model?: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionOptions {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface StreamChunk {
  content: string
  done: boolean
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * Create OpenRouter client
 */
export function createOpenRouterClient(config: OpenRouterConfig) {
  const baseUrl = config.baseUrl ?? 'https://openrouter.ai/api/v1'

  return {
    async chat(options: ChatCompletionOptions): Promise<string> {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'OpenCode Browser',
        },
        body: JSON.stringify({
          model: options.model ?? 'anthropic/claude-sonnet-4-20250514',
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
          stream: false,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(`OpenRouter API error: ${response.status} - ${JSON.stringify(error)}`)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content ?? ''
    },

    async *stream(options: ChatCompletionOptions): AsyncGenerator<StreamChunk> {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'OpenCode Browser',
        },
        body: JSON.stringify({
          model: options.model ?? 'anthropic/claude-sonnet-4-20250514',
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
          stream: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(`OpenRouter API error: ${response.status} - ${JSON.stringify(error)}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const data = trimmed.slice(6)
          if (data === '[DONE]') {
            yield { content: '', done: true }
            return
          }

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices[0]?.delta
            if (delta?.content) {
              yield { content: delta.content, done: false }
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    },
  }
}
