/**
 * Browser-only Session Page - renders a simple UI without server-dependent contexts
 */
import { useParams } from "@solidjs/router"
import { Show, createSignal, createEffect, For } from "solid-js"
import { useBrowserSDK } from "@/context/browser-sdk"
import { decode64 } from "@/utils/base64"

function ChatMessage(props: { role: string; content: string }) {
  return (
    <div class={`flex ${props.role === "user" ? "justify-end" : "justify-start"} mb-3`}>
      <div
        class={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
          props.role === "user"
            ? "bg-zinc-700 text-zinc-100"
            : "bg-zinc-800 text-zinc-200"
        }`}
      >
        {props.content}
      </div>
    </div>
  )
}

export function BrowserSessionPage() {
  const params = useParams()
  const sdk = useBrowserSDK()
  const [messages, setMessages] = createSignal<Array<{ role: string; content: string }>>([])
  const [input, setInput] = createSignal("")
  const [loading, setLoading] = createSignal(false)

  const sessionID = () => params.id

  const sendMessage = async () => {
    const text = input().trim()
    if (!text || loading()) return

    setMessages((prev) => [...prev, { role: "user", content: text }])
    setInput("")
    setLoading(true)

    // Get API key from localStorage
    const apiKey = localStorage.getItem("opencode_browser_api_key")
    const provider = localStorage.getItem("opencode_browser_provider") || "openai"

    if (!apiKey) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Please configure your API key in Settings first.",
        },
      ])
      setLoading(false)
      return
    }

    try {
      const systemPrompt = `You are a helpful AI coding assistant. You are running in a browser-only mode. The user's project directory is: ${sdk().directory || "unknown"}.`

      const response = await fetchChatCompletion(provider, apiKey, systemPrompt, messages(), text)
      setMessages((prev) => [...prev, { role: "assistant", content: response }])
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message || "Failed to get response"}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div class="flex flex-col h-full bg-zinc-950 text-zinc-100">
      <div class="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <div class="flex items-center gap-2">
          <a href="/" class="text-zinc-400 hover:text-zinc-200 text-sm transition-colors">Home</a>
          <span class="text-zinc-600">/</span>
          <span class="text-zinc-300 text-sm truncate max-w-[200px]">{sdk().directory}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs text-zinc-500">Session: {sessionID() || "new"}</span>
          <a
            href="/settings"
            class="text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
          >
            Settings
          </a>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-4">
        <Show when={messages().length > 0} fallback={
          <div class="flex items-center justify-center h-full text-zinc-500 text-sm">
            <div class="text-center space-y-2">
              <p>Start a conversation with your AI assistant.</p>
              <p class="text-xs">Configure your API key in Settings to get started.</p>
            </div>
          </div>
        }>
          <For each={messages()}>
            {(msg) => <ChatMessage role={msg.role} content={msg.content} />}
          </For>
        </Show>
        <Show when={loading()}>
          <div class="flex justify-start mb-3">
            <div class="bg-zinc-800 text-zinc-400 rounded-lg px-4 py-2 text-sm animate-pulse">
              Thinking...
            </div>
          </div>
        </Show>
      </div>
      <div class="border-t border-zinc-800 p-4">
        <div class="flex gap-2">
          <input
            type="text"
            value={input()}
            onInput={(e) => setInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Type a message..."
            class="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            disabled={loading()}
          />
          <button
            onClick={sendMessage}
            disabled={loading() || !input().trim()}
            class="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-zinc-100 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

async function fetchChatCompletion(
  provider: string,
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  userMessage: string,
): Promise<string> {
  const allMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ]

  if (provider === "openai" || provider === "openrouter") {
    const baseUrl = provider === "openrouter" ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1"
    const model = provider === "openrouter" ? "openai/gpt-4o-mini" : "gpt-4o-mini"
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages: allMessages }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message || "API error")
    return data.choices?.[0]?.message?.content || "No response"
  }

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [...messages.map((m) => ({ role: m.role, content: m.content })), { role: "user", content: userMessage }],
      }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message || "API error")
    return data.content?.[0]?.text || "No response"
  }

  if (provider === "groq") {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: allMessages }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message || "API error")
    return data.choices?.[0]?.message?.content || "No response"
  }

  if (provider === "google") {
    const contents = allMessages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }))
    const systemInstruction = allMessages.find((m) => m.role === "system")
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction.content }] } } : {}),
        }),
      },
    )
    const data = await res.json()
    if (data.error) throw new Error(data.error.message || "API error")
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response"
  }

  throw new Error(`Unsupported provider: ${provider}`)
}
