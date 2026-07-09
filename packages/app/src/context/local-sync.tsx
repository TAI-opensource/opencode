/**
 * Local Sync - Browser-based sync that replaces server-sync.tsx
 * Handles real-time updates without a server
 */

import { createSimpleContext } from "@opencode-ai/ui/context"
import { createGlobalEmitter } from "@solid-primitives/event-bus"
import { type Accessor, batch, createMemo, onCleanup, onMount, createSignal } from "solid-js"
import { useLocalSDK } from "./local-sdk"
import { SessionRepository, MessageRepository, PartRepository } from "@/db"

type LocalSyncEvent = {
  type: string
  properties: Record<string, any>
}

type LocalSyncEventMap = {
  [key in LocalSyncEvent["type"]]: Extract<LocalSyncEvent, { type: key }>
}

function createLocalSyncContextBase() {
  const sdk = useLocalSDK()
  const emitter = createGlobalEmitter<LocalSyncEventMap>()
  const [connected, setConnected] = createSignal(true)
  const [error, setError] = createSignal<string | null>(null)

  // Initialize sync
  onMount(() => {
    setConnected(true)
    console.log("[LocalSync] Initialized")
  })

  // Cleanup
  onCleanup(() => {
    console.log("[LocalSync] Cleanup")
  })

  // Event subscription
  function on(eventType: string, callback: (event: LocalSyncEvent) => void) {
    return emitter.on(eventType, callback)
  }

  // Session operations with local state
  async function createSession(params: {
    title: string
    projectId: string
    directory: string
    agent?: string
    modelId?: string
  }) {
    const session = sdk.createNewSession(params)
    emitter.emit("session.created", { properties: { sessionId: session.id } })
    return session
  }

  async function sendMessage(params: {
    sessionId: string
    content: string
    provider?: string
    model?: string
  }) {
    // Add user message
    const userMessage = sdk.addMessageToSession({
      sessionId: params.sessionId,
      role: "user",
      content: params.content,
    })

    emitter.emit("message.created", { properties: { sessionId: params.sessionId, messageId: userMessage.id } })

    // Get session history
    const history = sdk.getSession(params.sessionId)
    if (!history) {
      throw new Error("Session not found")
    }

    // Prepare messages for LLM
    const messages = history.messages.map((msg) => ({
      role: msg.role as "system" | "user" | "assistant",
      content: msg.parts
        .filter((p) => p.type === "text")
        .map((p) => JSON.parse(p.data).content)
        .join(""),
    }))

    // Get available provider
    const providers = sdk.getProviders()
    const provider = params.provider || providers[0]

    if (!provider) {
      throw new Error("No LLM provider configured")
    }

    // Stream response
    let assistantContent = ""
    const assistantMessage = sdk.addMessageToSession({
      sessionId: params.sessionId,
      role: "assistant",
      content: "",
    })

    emitter.emit("message.created", { properties: { sessionId: params.sessionId, messageId: assistantMessage.id } })

    await sdk.chat({
      provider,
      messages,
      model: params.model,
      onChunk: (chunk) => {
        assistantContent += chunk
        emitter.emit("message.part.delta", {
          properties: {
            sessionId: params.sessionId,
            messageId: assistantMessage.id,
            partId: assistantMessage.id,
            delta: chunk,
          },
        })
      },
    })

    // Update message with full content
    const parts = PartRepository.findByMessage(assistantMessage.id)
    if (parts.length > 0) {
      PartRepository.update(parts[0].id, {
        data: JSON.stringify({ content: assistantContent }),
      })
    }

    emitter.emit("message.completed", {
      properties: { sessionId: params.sessionId, messageId: assistantMessage.id },
    })

    return assistantMessage
  }

  // File operations
  async function readFile(path: string) {
    return sdk.readFile(path)
  }

  async function writeFile(path: string, content: string) {
    return sdk.writeFile(path, content)
  }

  async function editFile(path: string, oldString: string, newString: string) {
    return sdk.editFile(path, oldString, newString)
  }

  // Git operations
  async function gitStatus(path: string) {
    return sdk.gitStatus(path)
  }

  async function gitCommit(path: string, message: string) {
    return sdk.gitCommit(path, message)
  }

  async function gitPush(path: string, remote?: string) {
    return sdk.gitPush(path, remote)
  }

  async function gitPull(path: string, remote?: string) {
    return sdk.gitPull(path, remote)
  }

  // Tool execution
  async function executeTool(toolName: string, params: Record<string, any>) {
    return sdk.executeToolCall(toolName, params)
  }

  function getTools() {
    return sdk.getTools()
  }

  // Provider management
  function registerProvider(name: string, config: any) {
    sdk.registerProvider(name, config)
    emitter.emit("provider.registered", { properties: { name } })
  }

  function removeProvider(name: string) {
    sdk.removeProvider(name)
    emitter.emit("provider.removed", { properties: { name } })
  }

  function getProviders() {
    return sdk.getProviders()
  }

  return {
    connected,
    error,
    on,
    createSession,
    sendMessage,
    readFile,
    writeFile,
    editFile,
    gitStatus,
    gitCommit,
    gitPush,
    gitPull,
    executeTool,
    getTools,
    registerProvider,
    removeProvider,
    getProviders,
  }
}

type LocalSyncBase = ReturnType<typeof createLocalSyncContextBase>

export const { use: useLocalSync, provider: LocalSyncProvider } = createSimpleContext({
  name: "LocalSync",
  init: () => {
    return createLocalSyncContextBase()
  },
})

export type { LocalSyncBase }
