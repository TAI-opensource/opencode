/**
 * SSE Stream parser for LLM responses
 */

export interface StreamEvent {
  type: 'message' | 'delta' | 'error' | 'done'
  content?: string
  error?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * Parse SSE stream from fetch response
 */
export async function* parseSSEStream(
  response: Response
): AsyncGenerator<StreamEvent> {
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
      if (!trimmed) continue

      if (trimmed.startsWith('data: ')) {
        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          yield { type: 'done' }
          return
        }

        try {
          const parsed = JSON.parse(data)
          yield* handleStreamEvent(parsed)
        } catch {
          // Skip invalid JSON
        }
      } else if (trimmed.startsWith('event: ')) {
        // Handle named events if needed
      } else if (trimmed.startsWith('id: ')) {
        // Handle event IDs if needed
      }
    }
  }

  yield { type: 'done' }
}

/**
 * Handle different stream event formats
 */
function* handleStreamEvent(data: any): Generator<StreamEvent> {
  // OpenAI format
  if (data.choices?.[0]?.delta?.content) {
    yield {
      type: 'delta',
      content: data.choices[0].delta.content,
    }
    return
  }

  // Anthropic format
  if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
    yield {
      type: 'delta',
      content: data.delta.text,
    }
    return
  }

  // Anthropic message stop
  if (data.type === 'message_stop') {
    yield { type: 'done' }
    return
  }

  // Google format
  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
    yield {
      type: 'delta',
      content: data.candidates[0].content.parts[0].text,
    }
    return
  }

  // Error format
  if (data.error) {
    yield {
      type: 'error',
      error: typeof data.error === 'string' ? data.error : JSON.stringify(data.error),
    }
    return
  }

  // Usage format (final chunk with stats)
  if (data.usage) {
    yield {
      type: 'message',
      usage: {
        promptTokens: data.usage.prompt_tokens ?? 0,
        completionTokens: data.usage.completion_tokens ?? 0,
        totalTokens: data.usage.total_tokens ?? 0,
      },
    }
  }
}

/**
 * Accumulate stream into full response
 */
export async function accumulateStream(
  stream: AsyncGenerator<StreamEvent>
): Promise<{
  content: string
  usage?: StreamEvent['usage']
}> {
  let content = ''
  let usage: StreamEvent['usage'] | undefined

  for await (const event of stream) {
    if (event.type === 'delta' && event.content) {
      content += event.content
    } else if (event.type === 'message' && event.usage) {
      usage = event.usage
    } else if (event.type === 'error') {
      throw new Error(event.error ?? 'Stream error')
    }
  }

  return { content, usage }
}

/**
 * Transform stream with callback
 */
export async function transformStream(
  stream: AsyncGenerator<StreamEvent>,
  onChunk: (chunk: string) => void
): Promise<string> {
  let content = ''

  for await (const event of stream) {
    if (event.type === 'delta' && event.content) {
      content += event.content
      onChunk(event.content)
    } else if (event.type === 'error') {
      throw new Error(event.error ?? 'Stream error')
    }
  }

  return content
}
