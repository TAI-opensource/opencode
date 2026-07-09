/**
 * Google Gemini LLM Provider
 */

export interface GoogleConfig {
  apiKey: string
  baseUrl?: string
  model?: string
}

export interface ChatMessage {
  role: 'user' | 'model'
  parts: Array<{ text: string }>
}

export interface ChatCompletionOptions {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
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
 * Create Google Gemini client
 */
export function createGoogleClient(config: GoogleConfig) {
  const baseUrl = config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta'

  function convertMessages(messages: ChatCompletionOptions['messages']): ChatMessage[] {
    return messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }))
  }

  return {
    async chat(options: ChatCompletionOptions): Promise<string> {
      const model = options.model ?? 'gemini-2.0-flash'
      const contents = convertMessages(options.messages)

      const response = await fetch(
        `${baseUrl}/models/${model}:generateContent?key=${config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: options.temperature ?? 0.7,
              maxOutputTokens: options.maxTokens ?? 4096,
            },
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(`Google API error: ${response.status} - ${JSON.stringify(error)}`)
      }

      const data = await response.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    },

    async *stream(options: ChatCompletionOptions): AsyncGenerator<StreamChunk> {
      const model = options.model ?? 'gemini-2.0-flash'
      const contents = convertMessages(options.messages)

      const response = await fetch(
        `${baseUrl}/models/${model}:streamGenerateContent?key=${config.apiKey}&alt=sse`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: options.temperature ?? 0.7,
              maxOutputTokens: options.maxTokens ?? 4096,
            },
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(`Google API error: ${response.status} - ${JSON.stringify(error)}`)
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
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) {
              yield { content: text, done: false }
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      yield { content: '', done: true }
    },
  }
}
