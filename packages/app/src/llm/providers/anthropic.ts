/**
 * Anthropic Claude LLM Provider
 */

export interface AnthropicConfig {
  apiKey: string
  baseUrl?: string
  model?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatCompletionOptions {
  messages: ChatMessage[]
  system?: string
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
 * Create Anthropic client
 */
export function createAnthropicClient(config: AnthropicConfig) {
  const baseUrl = config.baseUrl ?? 'https://api.anthropic.com'

  return {
    async chat(options: ChatCompletionOptions): Promise<string> {
      const messages = options.system
        ? [{ role: 'user' as const, content: options.system }, ...options.messages]
        : options.messages

      const response = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: options.model ?? 'claude-sonnet-4-20250514',
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
          stream: false,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(`Anthropic API error: ${response.status} - ${JSON.stringify(error)}`)
      }

      const data = await response.json()
      return data.content[0]?.text ?? ''
    },

    async *stream(options: ChatCompletionOptions): AsyncGenerator<StreamChunk> {
      const messages = options.system
        ? [{ role: 'user' as const, content: options.system }, ...options.messages]
        : options.messages

      const response = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: options.model ?? 'claude-sonnet-4-20250514',
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
          stream: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(`Anthropic API error: ${response.status} - ${JSON.stringify(error)}`)
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

          try {
            const parsed = JSON.parse(data)

            if (parsed.type === 'content_block_delta') {
              if (parsed.delta?.type === 'text_delta') {
                yield { content: parsed.delta.text, done: false }
              }
            } else if (parsed.type === 'message_stop') {
              yield { content: '', done: true }
              return
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    },
  }
}
